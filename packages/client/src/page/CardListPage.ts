import { FancyButton, ScrollBox, Slider } from '@pixi/ui';
import { Howl } from 'howler';
import i18next from 'i18next';
import * as log from 'loglevel';
import { AdjustmentFilter } from 'pixi-filters';
import { AnimatedSprite, Assets, BitmapText, Container, FederatedEvent, Graphics, PointData, Sprite, Spritesheet, Text, TextStyleOptions, Texture } from 'pixi.js';
import { linear } from 'popmotion';
import { client } from '../client';
import { HoverButtonContainer } from '../components/HoverButtonContainer';
import { SliderControls } from '../components/SliderControls';
import { CrossHatchFilter } from '../filter/CrossHatchFilter';
import { getCurrentLocale } from '../i18n';
import { getNavigator } from '../navigation';
import { ReceivablePacket } from '../network/ReceivablePacket';
import { SendablePacket } from '../network/SendablePacket';
import { CardTemplate, getCardDefinition, isMonster } from '../template/CardTemplate';
import { cardNameComparator, createRect, onGlobalPointerMoveStop } from '../util/helpers';
import { BasePage } from './BasePage';
import MenuPage from './MenuPage';
import { ORDERED_ATTRIBUTES, ORDERED_RACES } from '../template/CardStats';

const CARD_ROWS = 5;
const CARD_COLUMNS = 10;
const CARDS_PER_PAGE = CARD_ROWS * CARD_COLUMNS;
const CARD_WIDTH = 50;
const CARD_HEIGHT = 72;
const DUMMY_TEXT = 'DUMMY'; // Texts must have a width or scroll box will complain at first
const CARD_PREVIEW_SCROLL_HEIGHT = 200;
const CARD_PREVIEW_MONSTER_SCROLL_HEIGHT = 183;
const CARD_PREVIEW_TXT_WRAP_WIDTH = 150;

interface CardInfo {
  id: number;
  templateId: number;
  isNew: boolean;
}

class CardListPage extends BasePage {
  private readonly mOwnedCards: CardInfo[] = [];
  private readonly mNewCardTmplIds: number[] = [];

  private mCardContainer: Container<Container>;
  private mCardCounter: BitmapText;

  private mCurrenPageNum: number = 1;

  private mCardAttributeSheet: Spritesheet;
  private mCardRaceSheet: Spritesheet;
  private mNewIndicatorSheet: Spritesheet;

  private mHoverCardFilter: AdjustmentFilter;
  private mHoverCardSprite: Sprite;

  private mPreviewCardImage: Sprite;
  private mPreviewCardScrollView: ScrollBox;
  private mPreviewCardScrollBar: SliderControls;
  private mPreviewCardName: Text;
  private mPreviewCardDesc1: Text;
  private mPreviewCardDesc2: Text;
  private mPreviewCardStatsContainer: Container;
  private mPreviewCardAttribute: Sprite;
  private mPreviewCardRace: Sprite;
  private mPreviewCardAtk: Text;
  private mPreviewCardDef: Text;
  private mPreviewCardId: number = 0;
  private mHoverCardTmpl: CardTemplate = null;

  private mClickSound: Howl;
  private mTrack: Howl;

  private mCardTemplates: CardTemplate[];

  private mCardCounterUpdateInterval: ReturnType<typeof setInterval>;
  private mNewIndiUpdateInterval: ReturnType<typeof setInterval>;

  private mLeftPageButton: HoverButtonContainer;
  private mRightPageButton: HoverButtonContainer;
  private mCurPageIndicator: BitmapText;

  private mIsNavigatingPages: boolean = false;
  private readonly mEscapeKeyCb = (event: KeyboardEvent) => {
    if (this.mIsTransitionCompleted && event.code === 'Escape') {
      window.removeEventListener('keydown', this.mEscapeKeyCb);
      this._goBack();
    }
  };

  private mIsTransitionCompleted: boolean;

  constructor() {
    super();
    this.eventMode = 'static';
  }

  async preload(): Promise<void> {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();

    await Assets.loadBundle(['cards', `${assetPrefix}/card_list`]);

    const { default: cardData } = await import('../data/cardData.json');

    this.mCardTemplates = Array.from(cardData);
    this.mCardTemplates.sort(cardNameComparator);

    this.mCardAttributeSheet = Assets.get('commons/icon_attribute.json');
    this.mCardRaceSheet = Assets.get('commons/icon_race.json');
    this.mNewIndicatorSheet = Assets.get(`${assetPrefix}/card_list/new_anime_${locale}.json`);
  }

  async onNavigatingTo(): Promise<void> {
    this.mIsTransitionCompleted = false;

    await this._init();
    await this._requestPlayerCards();

    this._startCardCounter();
  }

  async onNavigatedTo(): Promise<void> {
    onGlobalPointerMoveStop(this, () => this._updateCardPreviewIfNeeded());
    window.addEventListener('keydown', this.mEscapeKeyCb);
    this._playAudio();

    this._animateCardList().then(() => {
      this.mIsTransitionCompleted = true;
    });

    if (this.mOwnedCards.some((card) => card.isNew)) {
      this._animateNewCardIndicators();
    }
  }

  async onNavigatingFrom(): Promise<void> {
    this.stopAllAnimations();

    if (this.mCardCounterUpdateInterval != null) {
      clearInterval(this.mCardCounterUpdateInterval);
      this.mCardCounterUpdateInterval = null;
    }

    if (this.mNewIndiUpdateInterval != null) {
      clearInterval(this.mNewIndiUpdateInterval);
      this.mNewIndiUpdateInterval = null;
    }

    window.removeEventListener('keydown', this.mEscapeKeyCb);
    this.mTrack.stop();
  }

  onNavigatedFrom(): void | Promise<void> {
  }

  async _requestPlayerCards(): Promise<void> {
    if (this.mOwnedCards.length > 0) {
      this.mOwnedCards.splice(0);
    }

    if (this.mNewCardTmplIds.length > 0) {
      this.mNewCardTmplIds.splice(0);
    }
    
    try {
      const responseBuffer = await client.getSocket().emitWithAck('cardListRequest', new ArrayBuffer(0));
      const packet = new ReceivablePacket(responseBuffer);
      const length = packet.readInt32();

      for (let i = 0; i < length; i++) {
        const cardId = packet.readInt32();
        const cardTemplateId = packet.readInt32();
        const isNew = !!packet.readInt8();

        if (isNew) {
          this.mNewCardTmplIds.push(cardTemplateId);
        }

        this.mOwnedCards.push({
          id: cardId,
          templateId: cardTemplateId,
          isNew
        });
      }
    } catch (err) {
      log.error(err instanceof Error ? err.message : err);
    }
  }

  private async _init(): Promise<void> {
    const assetPrefix = client.gameMode;

    this.addChild(Sprite.from(`${assetPrefix}/card_list/list_bg.png`));

    this._drawTitle();
    this._drawBackButton();
    this._drawCardCounter();
    this._drawCardPreview();
    this._drawCardGrid();
    this._drawPagingControls();
    this._drawHoverElements();

    this.mClickSound = new Howl({
      src: 'commons/decide.ogg'
    });
    this.mTrack = new Howl({
      src: `${assetPrefix}/card_list/m_bag.ogg`,
      loop: true
    });
  }

  private _drawTitle(): void {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();

    const title = Sprite.from(`${assetPrefix}/card_list/${locale}_cardlisttitle2.png`);
    title.x = 205;

    const shadowTitle = Sprite.from(`${assetPrefix}/card_list/${locale}_cardlisttitle3.png`);
    shadowTitle.x = 205;
    shadowTitle.alpha = 0;

    this.animate({
      from: 0,
      to: 1,
      repeat: Infinity,
      repeatType: 'reverse',
      repeatDelay: 100,
      duration: 1000,
      onUpdate: (value: number) => {
        shadowTitle.alpha = value;
      }
    });

    this.addChild(title, shadowTitle);
  }

  private _drawBackButton(): void {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();

    const backButton = new FancyButton({
      defaultView: `${assetPrefix}/card_list/${locale}_back1.png`,
      hoverView: `${assetPrefix}/card_list/${locale}_back2.png`
    });
    const clickCb = () => {
      if (this.mIsTransitionCompleted) {
        backButton.off('click', clickCb);
        this.mClickSound.play();
        this._goBack();
      }
    };

    backButton.x = 692;
    backButton.on('click', clickCb);

    this.addChild(backButton);
  }

  private _drawCardCounter(): void {
    const counter = new BitmapText({
      style: {
        fontFamily: 'CardListCount',
        align: 'left',
      }
    });
    counter.x = 700;
    counter.y = 30;
    counter.anchor.x = 1;

    this.addChild(counter);

    this.mCardCounter = counter;
  }

  private _drawCardPreview(): void {
    const container = new Container();
    container.position.set(6, 87);

    const cardImage = Sprite.from('cards/card_backing.png');
    cardImage.setSize(200, 290);

    const cardDetails = this._generateCardPreviewDetails();
    const scrollBar = this._generateCardPreviewScrollBar();
    const cardStatsContainer = this._generateCardPreviewStatsContent();
    const scrollBarSlider = this.mPreviewCardScrollBar.slider;

    // Scroll handling
    this.mPreviewCardScrollView.onScroll.connect((value: number | PointData) => {
      const val = typeof value === 'number' ? value : value.y;
      scrollBarSlider.value = -val;
    });
    scrollBarSlider.onUpdate.connect((value: number) => {
      this.mPreviewCardScrollView.scrollToPosition({
        x: 0,
        y: value
      });
    });

    this.mPreviewCardImage = cardImage;

    container.addChild(cardImage, cardDetails, scrollBar, cardStatsContainer);
    this.addChild(container);
  }

  private _generateCardPreviewDetails(): ScrollBox {
    const scrollView = new ScrollBox();
    scrollView.position.set(14, 307);

    const cardName = new Text({
      text: DUMMY_TEXT,
      style: {
        fontSize: 11,
        padding: 1,
        fontWeight: 'bold',
        wordWrap: true,
        wordWrapWidth: CARD_PREVIEW_TXT_WRAP_WIDTH
      }
    });

    const cardDesc1 = new Text({
      text: DUMMY_TEXT,
      style: {
        fontSize: 11,
        lineHeight: 18,
        wordWrap: true,
        wordWrapWidth: CARD_PREVIEW_TXT_WRAP_WIDTH
      }
    });

    const cardDesc2 = new Text({
      text: DUMMY_TEXT,
      style: {
        fontSize: 11,
        lineHeight: 18,
        wordWrap: true,
        wordWrapWidth: CARD_PREVIEW_TXT_WRAP_WIDTH
      }
    });

    scrollView.init({
      width: 180,
      height: CARD_PREVIEW_SCROLL_HEIGHT,
      type: 'vertical',
      globalScroll: true,
      items: [
        cardName,
        cardDesc1,
        cardDesc2
      ]
    });

    // This is a hackish solution to avoid pixi UI complaining about zero widths
    cardName.text = '';
    cardDesc1.text = '';
    cardDesc2.text = '';

    this.mPreviewCardScrollView = scrollView;
    this.mPreviewCardName = cardName;
    this.mPreviewCardDesc1 = cardDesc1;
    this.mPreviewCardDesc2 = cardDesc2;

    return scrollView;
  }

  private _generateCardPreviewScrollBar(): Container {
    const assetPrefix = client.gameMode;
    const scrollBar = new SliderControls();
    scrollBar.position.set(172, 313);
    scrollBar.visible = false;

    const scrollUpButton = new FancyButton({
      defaultView: `${assetPrefix}/card_list/scroll_minus0.png`,
      pressedView: `${assetPrefix}/card_list/scroll_minus1.png`,
    });

    const scrollDownButton = new FancyButton({
      defaultView: `${assetPrefix}/card_list/scroll_plus0.png`,
      pressedView: `${assetPrefix}/card_list/scroll_plus1.png`,
    });
    scrollDownButton.y = 178;

    const sliderBg = Sprite.from(`${assetPrefix}/card_list/scroll_bar.png`);
    sliderBg.y = 15;
    const scrollTrack = Sprite.from(`${assetPrefix}/card_list/scroll_box.png`);
    const sliderDummyBg = createRect(sliderBg.y - 16, sliderBg.x, sliderBg.height - 16, sliderBg.width);

    scrollTrack.angle = -93;

    const slider = new Slider({
      bg: sliderDummyBg,
      fill: new Graphics(),
      slider: scrollTrack
    });
    slider.y = 23;
    slider.angle = 93;
    slider.pivot.set(0, 28);

    scrollBar.init({
      decreaseView: scrollUpButton,
      increaseView: scrollDownButton,
      slider,
      bg: sliderBg
    });

    this.mPreviewCardScrollBar = scrollBar;

    return scrollBar;
  }

  private _generateCardPreviewStatsContent(): Container {
    const assetPrefix = client.gameMode;
    const statsTextStyle: TextStyleOptions = {
      fontSize: 11,
      fontWeight: 'bold'
    };

    const container = new Container();
    container.position.y = 490;
    container.visible = false;

    const line = Sprite.from(`${assetPrefix}/card_list/line.png`);

    const cardAttribute = new Sprite();
    cardAttribute.position.set(12, 1);

    const cardRace = new Sprite();
    cardRace.position.set(28, 1);

    const atkLabel = new Text({
      text: 'ATK/',
      style: statsTextStyle
    });
    atkLabel.position.set(46, 2);

    const defLabel = new Text({
      text: 'DEF/',
      style: statsTextStyle
    });
    defLabel.position.set(106, 2);

    const cardAtk = new Text({
      style: statsTextStyle
    });
    cardAtk.anchor.x = 1;
    cardAtk.position.set(98, 2);

    const cardDef = new Text({
      style: statsTextStyle
    });
    cardDef.anchor.x = 1;
    cardDef.position.set(158, 2);

    this.mPreviewCardStatsContainer = container;
    this.mPreviewCardAttribute = cardAttribute;
    this.mPreviewCardRace = cardRace;
    this.mPreviewCardAtk = cardAtk;
    this.mPreviewCardDef = cardDef;

    container.addChild(line, cardAttribute, cardRace, atkLabel, cardAtk, defLabel, cardDef);
    return container;
  }

  private _drawCardGrid(): void {
    const colSpacing = 5;
    const rowSpacing = 15;

    const container = new Container<Container>({
      isRenderGroup: true
    });
    container.position.set(225, 110);

    for (let row = 0; row < CARD_ROWS; row++) {
      let x, y: number;

      if (row === 0) {
        y = 0;
      } else {
        y = ((CARD_HEIGHT + rowSpacing) * row);
      }

      for (let col = 0; col < CARD_COLUMNS; col++) {
        const index = (row * CARD_COLUMNS) + col;
        const cardView = new Container();
        const cardSprite: Sprite = Sprite.from('cards/card_backing.png');
        const newIndicator = this._createNewIndicator();

        if (col === 0) {
          x = 25;
        } else {
          x = 25 + ((CARD_WIDTH + colSpacing) * col);
        }

        cardView.position.set(x, y);
        cardView.pivot.set(CARD_WIDTH / 2, CARD_HEIGHT * 0.45);
        cardView.scale.x = 0;

        cardSprite.setSize(CARD_WIDTH, CARD_HEIGHT);
        cardSprite.eventMode = 'static';

        newIndicator.position.set(7, 26);
        newIndicator.visible = false;

        cardView.addChild(cardSprite, newIndicator);
        container.addChild(cardView);

        this._registerCardClickListener(cardView, index);
        this._registerCardHoverListener(cardView, index);
      }
    }

    this.addChild(container);

    this.mCardContainer = container;
  }

  private _createNewIndicator(): AnimatedSprite {
    const indicator = new AnimatedSprite(this.mNewIndicatorSheet.animations.news);
    indicator.animationSpeed = 0.1;
    indicator.eventMode = 'none';

    return indicator;
  }

  private _drawPagingControls(): void {
    const assetPrefix = client.gameMode;
    const totalPages = this.mCardTemplates.length / CARDS_PER_PAGE;

    const leftButton = new HoverButtonContainer(Sprite.from(`${assetPrefix}/card_list/pe_arrow_l.png`));
    leftButton.position.set(408, 565);
    leftButton.eventMode = 'none';
    leftButton.onclick = (e) => this._onPageClick(e);

    const currentPageNumber = new BitmapText({
      text: this.mCurrenPageNum,
      style: {
        fontFamily: 'PageNumbers',
        fontSize: 21
      },
    });
    currentPageNumber.position.set(478, 565);
    currentPageNumber.anchor.x = 0.5;

    const endPageNumber = new BitmapText({
      text: totalPages,
      style: {
        fontFamily: 'PageNumbers',
        fontSize: 21
      },
    });
    endPageNumber.position.set(531, 565);
    endPageNumber.anchor.x = 0.5;

    const rightButton = new HoverButtonContainer(Sprite.from(`${assetPrefix}/card_list/pe_arrow_r.png`));
    rightButton.position.set(549, 565);
    rightButton.onclick = (e) => this._onPageClick(e);

    this.addChild(leftButton, currentPageNumber, endPageNumber, rightButton);

    this.mLeftPageButton = leftButton;
    this.mCurPageIndicator = currentPageNumber;
    this.mRightPageButton = rightButton;
  }

  private _drawHoverElements(): void {
    const assetPrefix = client.gameMode;

    this.mHoverCardSprite = Sprite.from(`${assetPrefix}/card_list/card_border_s.png`);
    this.mHoverCardSprite.visible = false;
    this.mHoverCardSprite.anchor.x = 0.5;
    this.mHoverCardSprite.eventMode = 'none';
    this.addChild(this.mHoverCardSprite);

    this.mHoverCardFilter = new AdjustmentFilter({
      brightness: 1.3
    });
  }

  private _startCardCounter(): void {
    const ownedCount = this.mOwnedCards.length;

    let isPercentageDisplay = true;
    let value = (ownedCount / this.mCardTemplates.length) * 100;

    this.mCardCounter.text = `${value.toFixed(1)}%`;

    this.mCardCounterUpdateInterval = setInterval(() => {
      if (isPercentageDisplay) {
        isPercentageDisplay = false;
        this.mCardCounter.text = `${ownedCount}/${this.mCardTemplates.length}`;
      } else {
        isPercentageDisplay = true;

        value = (ownedCount / this.mCardTemplates.length) * 100;
        this.mCardCounter.text = `${value.toFixed(1)}%`;
      }
    }, 3000);
  }

  private async _goBack(): Promise<void> {
    await getNavigator().navigate({
      createPage: () => new MenuPage(),
      transition: {
        filter: new CrossHatchFilter(),
        duration: 1500
      }
    });
  }

  private async _onPageClick(event: FederatedEvent): Promise<void> {
    if (!this.mIsTransitionCompleted || this.mIsNavigatingPages) {
      return;
    }

    this.mIsNavigatingPages = true;

    const isForward = event.currentTarget === this.mRightPageButton;
    const totalPages = this.mCardTemplates.length / CARDS_PER_PAGE;

    this.mClickSound.play();

    if (isForward) {
      if (this.mCurrenPageNum === 1) {
        this.mLeftPageButton.setInteractive(true);
      }

      this.mCurrenPageNum++;

      if (this.mCurrenPageNum >= totalPages) {
        this.mRightPageButton.setInteractive(false);
      }
    } else {
      if (this.mCurrenPageNum === totalPages) {
        this.mRightPageButton.setInteractive(true);
      }

      this.mCurrenPageNum--;

      if (this.mCurrenPageNum <= 1) {
        this.mLeftPageButton.setInteractive(false);
      }
    }

    this.mCurPageIndicator.text = this.mCurrenPageNum;

    await this._startPagingTransition(isForward);

    this.mIsNavigatingPages = false;
  }

  private _registerCardClickListener(cardView: Container, index: number): void {
    const [cardImage, newIndicator] = cardView.children;

    cardImage.onclick = () => {
      if (this.mNewCardTmplIds.length == 0) {
        return;
      }

      const startDataIndex = (this.mCurrenPageNum - 1) * CARDS_PER_PAGE;
      const dataIndex = index + startDataIndex;
      const cardTemplate = this.mCardTemplates[dataIndex];
      const card = this.mOwnedCards.find((card) => card.templateId === cardTemplate.id);

      if (card == null) {
        return;
      }

      const newIdx = this.mNewCardTmplIds.indexOf(card.templateId);
      if (newIdx > -1) {
        const sp = new SendablePacket();

        this.mNewCardTmplIds.splice(newIdx, 1);
        sp.writeInt32(card.id);

        try {
          client.getSocket().emit('clearCardNewStateRequest', sp.buffer);
          card.isNew = false;
          newIndicator.visible = false;

          if (this.mNewCardTmplIds.length == 0 && this.mNewIndiUpdateInterval != null) {
            clearInterval(this.mNewIndiUpdateInterval);
            this.mNewIndiUpdateInterval = null;
          }
        } catch (err) {
          // Re-add in case of failure
          card.isNew = true;
          this.mNewCardTmplIds.push(card.templateId);
          log.error(err instanceof Error ? err.message : err);
        }
      }
    };
  }

  private _registerCardHoverListener(cardView: Container, index: number): void {
    const { x, y } = cardView.parent;
    const [cardImage] = cardView.children;

    cardImage.onpointerenter = () => {
      const startDataIndex = (this.mCurrenPageNum - 1) * CARDS_PER_PAGE;
      const dataIndex = index + startDataIndex;
      const cardTemplate = this.mCardTemplates[dataIndex];

      if (this.mHoverCardTmpl !== cardTemplate) {
        this.mHoverCardTmpl = cardTemplate;
      }

      cardImage.filters = this.mHoverCardFilter;
      this.mHoverCardSprite.visible = true;
      this.mHoverCardSprite.position.set(x + cardView.x, (y + cardView.y) - 4);
    };

    cardImage.onpointerleave = () => {
      cardImage.filters = null;
      this.mHoverCardSprite.visible = false;
      this.mHoverCardTmpl = null;
    };
  }

  private _updateCardPreviewIfNeeded() {
    const template = this.mHoverCardTmpl;

    if (!template || template.id === this.mPreviewCardId) {
      return;
    }

    let isMonsterCard: boolean;
    let cardId: number;
    let name: string;
    let definition: string;
    let desc: string;
    let attributeTexture: Texture;
    let raceTexture: Texture;
    let atk: string;
    let def: string;

    if (this.mOwnedCards.some((card) => card.templateId === template.id)) {
      const attributeIndex = ORDERED_ATTRIBUTES.indexOf(template.attribute);
      const raceIndex = ORDERED_RACES.indexOf(template.race);
      isMonsterCard = isMonster(template);

      cardId = template.id;
      name = i18next.t(`cards.${cardId}.name`);
      definition = isMonsterCard ? getCardDefinition(template) : '';
      desc = i18next.t(`cards.${cardId}.desc`);
      attributeTexture = attributeIndex >= 0 ? this.mCardAttributeSheet.textures[`attr-${attributeIndex}`] : null;
      raceTexture = raceIndex >= 0 ? this.mCardRaceSheet.textures[`race-${raceIndex}`] : null;
      atk = template.atk.toString();
      def = template.def.toString();
    } else {
      isMonsterCard = false;
      cardId = 0;
      name = '';
      definition = '';
      desc = '';
      attributeTexture = null;
      raceTexture = null;
      atk = '';
      def = '';
    }

    if (this.mPreviewCardId !== cardId) {
      this.mPreviewCardId = cardId;
      this.mPreviewCardImage.texture = Assets.get(cardId ? `cards/images/${cardId}.png` : 'cards/card_backing.png');
      this.mPreviewCardName.text = name;

      if (definition) {
        this.mPreviewCardDesc1.text = definition;
        this.mPreviewCardDesc1.scale.y = 1;
        this.mPreviewCardDesc2.text = desc;
      } else {
        this.mPreviewCardDesc1.text = '';
        this.mPreviewCardDesc1.scale.y = 0;
        this.mPreviewCardDesc2.text = desc;
      }

      this.mPreviewCardAttribute.texture = attributeTexture;
      this.mPreviewCardRace.texture = raceTexture;
      this.mPreviewCardAtk.text = atk;
      this.mPreviewCardDef.text = def;

      if (isMonsterCard) {
        this.mPreviewCardScrollView.height = CARD_PREVIEW_MONSTER_SCROLL_HEIGHT;
        this.mPreviewCardStatsContainer.visible = true;
      } else {
        this.mPreviewCardScrollView.height = CARD_PREVIEW_SCROLL_HEIGHT;
        this.mPreviewCardStatsContainer.visible = false;
      }
    }

    // Scrollbar handling
    const scrollDiff = this.mPreviewCardScrollView.scrollHeight - this.mPreviewCardScrollView.height;
    const scrollBarSlider = this.mPreviewCardScrollBar.slider;

    scrollBarSlider.value = 0;
    scrollBarSlider.max = Math.max(scrollDiff, 1);
    scrollBarSlider.step = 0.01 * scrollBarSlider.max
    this.mPreviewCardScrollBar.visible = scrollDiff > 0;
  }

  private _playAudio(): void {
    this.mTrack.play();
  }

  private _animateCardList(): Promise<void[]> {
    const cardViews = this.mCardContainer.children;
    const startIndex = CARD_COLUMNS - 1;
    const cardData = this.mCardTemplates.slice((this.mCurrenPageNum - 1) * CARDS_PER_PAGE, (this.mCurrenPageNum - 1) * CARDS_PER_PAGE + CARDS_PER_PAGE);
    const animationPromises: Promise<void>[] = [];

    for (let col = startIndex; col >= 0; col--) {
      const positionAnimation = this.animate({
        from: CARD_HEIGHT * 0.45,
        to: 0,
        duration: 200,
        elapsed: -100 * Math.abs(startIndex - col),
        ease: linear,
        onUpdate: (value: number) => {
          for (let i = col; i < CARDS_PER_PAGE + col; i += CARD_COLUMNS) {
            const cardView = cardViews[i];
            if (cardView) {
              cardView.pivot.y = value;
            }
          }
        }
      });

      animationPromises.push(positionAnimation.finished);

      for (let i = col; i < CARDS_PER_PAGE + col; i += CARD_COLUMNS) {
        const slotIndex = (i - col) / CARD_COLUMNS;
        const cardView = cardViews[i];

        if (cardView) {
          const [cardImage, newIndicator] = cardView.children;
          const cardTemplate = cardData[i];
          const card = this.mOwnedCards.find((card) => card.templateId === cardTemplate.id);

          let textureSource: string;
          let isNew: boolean;

          if (card) {
            textureSource = `cards/images/${card.templateId}.png`;
            isNew = card.isNew;
          } else {
            textureSource = 'cards/card_backing.png';
            isNew = false;
          }

          if (cardImage instanceof Sprite) {
            cardImage.texture = Texture.from(textureSource);
          }

          if (newIndicator instanceof AnimatedSprite) {
            if (isNew) {
              newIndicator.visible = true;
              newIndicator.play();
            } else {
              newIndicator.gotoAndStop(0);
              newIndicator.visible = false;
            }
          }

          const scaleAnimation = this.animate({
            from: 0,
            to: 1,
            duration: 100,
            elapsed: -100 * Math.abs(startIndex - col) - (100 * slotIndex),
            ease: linear,
            onUpdate: (value: number) => {
              cardView.scale.x = value;
            }
          });

          animationPromises.push(scaleAnimation.finished);
        }
      }
    }

    return Promise.all(animationPromises);
  }

  private _animateNewCardIndicators(): void {
    if (this.mNewIndiUpdateInterval != null) {
      clearInterval(this.mNewIndiUpdateInterval);
      this.mNewIndiUpdateInterval = null;
    }

    this.mNewIndiUpdateInterval = setInterval(() => {
      this.animate({
        from: 1,
        to: 0,
        repeat: 1,
        repeatType: 'reverse',
        duration: 400,
        onUpdate: (value: number) => {
          for (const cardView of this.mCardContainer.children) {
            const newIndicator = cardView.children[1];
            newIndicator.alpha = value;
          }
        }
      });
    }, 2500);
  }

  private _startPagingTransition(forward: boolean): Promise<void[]> {
    const cardViews = this.mCardContainer.children;
    const startIndex = forward ? (CARD_COLUMNS - 1) : 0;
    const cardTemplates = this.mCardTemplates.slice((this.mCurrenPageNum - 1) * CARDS_PER_PAGE, (this.mCurrenPageNum - 1) * CARDS_PER_PAGE + CARDS_PER_PAGE);
    const animationPromises: Promise<void>[] = [];

    for (let i = 0; i < CARD_COLUMNS; i++) {
      const col = forward ? (CARD_COLUMNS - 1) - i : i;

      const positionAnimation = this.animate({
        from: 0,
        to: CARD_HEIGHT * 0.45,
        duration: 200,
        elapsed: -100 * Math.abs(startIndex - col),
        ease: linear,
        repeat: 1,
        repeatType: 'reverse',
        onUpdate: (value: number) => {
          for (let j = col; j < CARDS_PER_PAGE + col; j += CARD_COLUMNS) {
            const cardView = cardViews[j];
            if (cardView) {
              cardView.pivot.y = value;
            }
          }
        }
      });

      animationPromises.push(positionAnimation.finished);

      for (let j = col; j < CARDS_PER_PAGE + col; j += CARD_COLUMNS) {
        const slotIndex = (j - col) / CARD_COLUMNS;
        const cardView = cardViews[j];

        if (cardView) {
          const scaleAnimation = this.animate({
            from: 1,
            to: 0,
            duration: 100,
            elapsed: -100 * Math.abs(startIndex - col) - (40 * slotIndex),
            ease: linear,
            repeat: 1,
            repeatType: 'reverse',
            onUpdate: (value: number) => {
              cardView.scale.x = value;
            },
            onRepeat: () => {
              const [cardImage, newIndicator] = cardView.children;
              const cardTemplate = cardTemplates[j];
              const card = this.mOwnedCards.find((card) => card.templateId === cardTemplate.id);

              let textureSource: string;
              let isNew: boolean;

              if (card) {
                textureSource = `cards/images/${card.templateId}.png`;
                isNew = card.isNew;
              } else {
                textureSource = 'cards/card_backing.png';
                isNew = false;
              }

              if (cardImage instanceof Sprite) {
                cardImage.texture = Texture.from(textureSource);
              }

              if (newIndicator instanceof AnimatedSprite) {
                if (isNew) {
                  newIndicator.visible = true;
                  newIndicator.play();
                } else {
                  newIndicator.gotoAndStop(0);
                  newIndicator.visible = false;
                }
              }
            }
          });

          animationPromises.push(scaleAnimation.finished);
        }
      }
    }

    return Promise.all(animationPromises);
  }
}

export default CardListPage;