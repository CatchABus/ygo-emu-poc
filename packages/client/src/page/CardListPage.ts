import { FancyButton, ScrollBox, Slider } from '@pixi/ui';
import { Howl } from 'howler';
import i18next from 'i18next';
import log from 'loglevel';
import { AdjustmentFilter } from 'pixi-filters';
import { AnimatedSprite, Assets, BitmapText, Container, FederatedEvent, Graphics, Sprite, Spritesheet, Text, TextStyleOptions, Texture } from 'pixi.js';
import { linear } from 'popmotion';
import { client } from '../client';
import { HoverButtonContainer } from '../components/HoverButtonView';
import { SliderControls } from '../components/SliderControls';
import { CrossHatchFilter } from '../filter/CrossHatchFilter';
import { getCurrentLocale } from '../i18n';
import { getNavigator } from '../navigation';
import { ReceivablePacket } from '../network/ReceivablePacket';
import { SendablePacket } from '../network/SendablePacket';
import { CardTemplate, getCardDefinition, isMonster } from '../template/CardTemplate';
import { cardNameComparator } from '../util/helpers';
import { BasePage } from './BasePage';
import MenuPage from './MenuPage';

const CARD_ROWS = 5;
const CARD_COLUMNS = 10;
const CARDS_PER_PAGE = CARD_ROWS * CARD_COLUMNS;
const CARD_WIDTH = 50;
const CARD_HEIGHT = 72;
const DUMMY_TEXT = 'DUMMY'; // Texts must have a width or scroll box will complain at first
const CARD_PREVIEW_SCROLL_HEIGHT = 200;
const CARD_PREVIEW_MONSTER_SCROLL_HEIGHT = 183;

interface CardIdInfo {
  id: number;
  templateId: number;
}

class CardListPage extends BasePage {
  private readonly _ownedCards: CardIdInfo[] = [];
  private readonly _newCardTemplateIds: number[] = [];

  private _cardContainer: Container<Container>;
  private _backButton: FancyButton;
  private _cardCounter: BitmapText;

  private _currenPageNum: number = 1;

  private _cardAttributeSheet: Spritesheet;
  private _cardRaceSheet: Spritesheet;
  private _newIndicatorSheet: Spritesheet;

  private _hoverCardFilter: AdjustmentFilter;
  private _hoverCardSprite: Sprite;

  private _previewCardImage: Sprite;
  private _previewCardScrollView: ScrollBox;
  private _previewCardScrollBar: SliderControls;
  private _previewCardName: Text;
  private _previewCardDesc1: Text;
  private _previewCardDesc2: Text;
  private _previewCardStatsContainer: Container;
  private _previewCardAttribute: Sprite;
  private _previewCardRace: Sprite;
  private _previewCardAtk: Text;
  private _previewCardDef: Text;
  private _previewCardId: number = 0;

  private _clickSound: Howl;
  private _track: Howl;

  private _cardData: CardTemplate[];

  private _cardCounterUpdateInterval: ReturnType<typeof setInterval>;
  private _newIndicatorsUpdateInterval: ReturnType<typeof setInterval>;

  private _leftPageButton: HoverButtonContainer;
  private _rightPageButton: HoverButtonContainer;
  private _currentPageIndicator: BitmapText;

  async preload(): Promise<void> {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();

    await Assets.loadBundle(['cards', `${assetPrefix}/card_list`]);

    const { default: cardData } = await import('../data/cardData.json');

    this._cardData = cardData;
    this._cardData.sort(cardNameComparator);

    this._cardAttributeSheet = Assets.get('cards/icon_attribute.json');
    this._cardRaceSheet = Assets.get('cards/icon_race.json');
    this._newIndicatorSheet = Assets.get(`${assetPrefix}/card_list/new_anime_${locale}.json`);
  }

  async onNavigatingTo(): Promise<void> {
    await this._init();
    await this._requestPlayerCards();

    this._startCardCounter();
  }

  async onNavigatedTo(): Promise<void> {
    this._addEscapeKeyListener();
    this._playAudio();

    this._animateCardList().then(() => this._attachInteractionListeners());

    if (this._newCardTemplateIds.length) {
      this._animateNewCardIndicators();
    }
  }

  async onNavigatingFrom(): Promise<void> {
    this.stopAllAnimations();

    if (this._cardCounterUpdateInterval != null) {
      clearInterval(this._cardCounterUpdateInterval);
      this._cardCounterUpdateInterval = null;
    }

    if (this._newIndicatorsUpdateInterval != null) {
      clearInterval(this._newIndicatorsUpdateInterval);
      this._newIndicatorsUpdateInterval = null;
    }

    this._track.stop();
  }

  onNavigatedFrom(): void | Promise<void> {
  }

  async _requestPlayerCards(): Promise<void> {
    try {
      const responseBuffer = await client.getSocket().emitWithAck('cardListRequest', new ArrayBuffer(0));
      const packet = new ReceivablePacket(responseBuffer);
      const length = packet.readInt32();

      for (let i = 0; i < length; i++) {
        const cardId = packet.readInt32();
        const cardTemplateId = packet.readInt32();
        const isNew = packet.readInt8() === 1;

        this._ownedCards.push({
          id: cardId,
          templateId: cardTemplateId
        });

        if (isNew) {
          this._newCardTemplateIds.push(cardTemplateId);
        }
      }
    } catch (err) {
      log.error(err);
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

    this._clickSound = new Howl({
      src: 'commons/decide.ogg'
    });
    this._track = new Howl({
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
    backButton.x = 692;

    this.addChild(backButton);
    this._backButton = backButton;
  }

  private _drawCardCounter(): void {
    const counter = new BitmapText({
      style: {
        fontFamily: 'CardListCount',
        align: 'left',
      },
    });
    counter.x = 700;
    counter.y = 30;
    counter.anchor.x = 1;

    this.addChild(counter);

    this._cardCounter = counter;
  }

  private _drawCardPreview(): void {
    const container = new Container();
    container.position.set(6, 87);

    const cardImage = Sprite.from('cards/card_backing.png');
    cardImage.setSize(200, 290);

    const cardDetails = this._generateCardPreviewDetails();
    const scrollBar = this._generateCardPreviewScrollBar();
    const cardStatsContainer = this._generateCardPreviewStatsContent();
    const scrollBarSlider = this._previewCardScrollBar.slider;

    // Scroll handling
    this._previewCardScrollView.onScroll.connect((value: number) => {
      scrollBarSlider.value = -value;
    });
    scrollBarSlider.onUpdate.connect((value: number) => {
      this._previewCardScrollView.scrollToPosition({
        x: 0,
        y: value
      });
    });

    this._previewCardImage = cardImage;

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
        wordWrapWidth: 150
      }
    });

    const cardDesc1 = new Text({
      text: DUMMY_TEXT,
      style: {
        fontSize: 11,
        lineHeight: 18,
        wordWrap: true,
        wordWrapWidth: 150
      }
    });

    const cardDesc2 = new Text({
      text: DUMMY_TEXT,
      style: {
        fontSize: 11,
        lineHeight: 18,
        wordWrap: true,
        wordWrapWidth: 150
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

    this._previewCardScrollView = scrollView;
    this._previewCardName = cardName;
    this._previewCardDesc1 = cardDesc1;
    this._previewCardDesc2 = cardDesc2;

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
    const sliderDummyBg = new Graphics().rect(sliderBg.y - 16, sliderBg.x, sliderBg.height - 16, sliderBg.width)
      .fill('transparent');

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

    this._previewCardScrollBar = scrollBar;

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

    this._previewCardStatsContainer = container;
    this._previewCardAttribute = cardAttribute;
    this._previewCardRace = cardRace;
    this._previewCardAtk = cardAtk;
    this._previewCardDef = cardDef;

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

    this._cardContainer = container;
  }

  private _createNewIndicator(): AnimatedSprite {
    const indicator = new AnimatedSprite(this._newIndicatorSheet.animations.news);
    indicator.animationSpeed = 0.1;
    indicator.eventMode = 'none';

    return indicator;
  }

  private _drawPagingControls(): void {
    const assetPrefix = client.gameMode;
    const totalPages = this._cardData.length / CARDS_PER_PAGE;

    const leftButton = new HoverButtonContainer(Sprite.from(`${assetPrefix}/card_list/pe_arrow_l.png`));
    leftButton.position.set(408, 565);
    leftButton.eventMode = 'none';

    const currentPageNumber = new BitmapText({
      text: this._currenPageNum,
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

    this.addChild(leftButton, currentPageNumber, endPageNumber, rightButton);

    this._leftPageButton = leftButton;
    this._currentPageIndicator = currentPageNumber;
    this._rightPageButton = rightButton;
  }

  private _drawHoverElements(): void {
    const assetPrefix = client.gameMode;

    this._hoverCardSprite = Sprite.from(`${assetPrefix}/card_list/card_border_s.png`);
    this._hoverCardSprite.visible = false;
    this._hoverCardSprite.anchor.x = 0.5;
    this._hoverCardSprite.eventMode = 'none';
    this.addChild(this._hoverCardSprite);

    this._hoverCardFilter = new AdjustmentFilter({
      brightness: 1.3
    });
  }

  private _startCardCounter(): void {
    let isPercentageDisplay = true;
    let value = (this._ownedCards.length / this._cardData.length) * 100;

    this._cardCounter.text = `${value.toFixed(1)}%`;

    this._cardCounterUpdateInterval = setInterval(() => {
      if (isPercentageDisplay) {
        isPercentageDisplay = false;
        this._cardCounter.text = `${this._ownedCards.length}/${this._cardData.length}`;
      } else {
        isPercentageDisplay = true;

        value = (this._ownedCards.length / this._cardData.length) * 100;
        this._cardCounter.text = `${value.toFixed(1)}%`;
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

  private _attachInteractionListeners(): void {
    const totalPages = this._cardData.length / CARDS_PER_PAGE;
    let isNavigating = false;

    this._backButton.onclick = async () => {
      this._clickSound.play();
      await this._goBack();
    };

    const pageClickCallback = async (event: FederatedEvent) => {
      if (isNavigating) {
        return;
      }

      isNavigating = true;

      const isForward = event.currentTarget === this._rightPageButton;

      this._clickSound.play();

      if (isForward) {
        if (this._currenPageNum === 1) {
          this._leftPageButton.setInteractive(true);
        }

        this._currenPageNum++;

        if (this._currenPageNum >= totalPages) {
          this._rightPageButton.setInteractive(false);
        }
      } else {
        if (this._currenPageNum === totalPages) {
          this._rightPageButton.setInteractive(true);
        }

        this._currenPageNum--;

        if (this._currenPageNum <= 1) {
          this._leftPageButton.setInteractive(false);
        }
      }

      this._currentPageIndicator.text = this._currenPageNum;

      await this._startPagingTransition(isForward);

      isNavigating = false;
    };

    this._leftPageButton.onclick = pageClickCallback;
    this._rightPageButton.onclick = pageClickCallback;
  }

  private _addEscapeKeyListener(): void {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        window.removeEventListener('keydown', onKeyDown);
        this._goBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
  }

  private _registerCardClickListener(cardView: Container, index: number): void {
    const [cardImage, newIndicator] = cardView.children;

    cardImage.onclick = () => {
      const startDataIndex = (this._currenPageNum - 1) * CARDS_PER_PAGE;
      const dataIndex = index + startDataIndex;
      const cardTemplate = this._cardData[dataIndex];
      const newCardIndex = this._newCardTemplateIds.indexOf(cardTemplate.id);

      if (newCardIndex >= 0) {
        const sp = new SendablePacket();

        sp.writeInt32(cardTemplate.id);

        try {
          client.getSocket().emit('clearCardNewStateRequest', sp.buffer);
          this._newCardTemplateIds.splice(newCardIndex, 1);
          newIndicator.visible = false;

          if (!this._newCardTemplateIds.length && this._newIndicatorsUpdateInterval != null) {
            clearInterval(this._newIndicatorsUpdateInterval);
            this._newIndicatorsUpdateInterval = null;
          }
        } catch (err) {
          log.error(err);
        }
      }
    };
  }

  private _registerCardHoverListener(cardView: Container, index: number): void {
    const { x, y } = cardView.parent;
    const [cardImage] = cardView.children;

    let isMonsterCard: boolean;
    let cardId: number;
    let name: string;
    let definition: string;
    let desc: string;
    let attributeTexture: Texture;
    let raceTexture: Texture;
    let atk: string;
    let def: string;

    cardImage.onpointerenter = () => {
      const startDataIndex = (this._currenPageNum - 1) * CARDS_PER_PAGE;
      const dataIndex = index + startDataIndex;
      const cardTemplate = this._cardData[dataIndex];


      if (cardTemplate && this._ownedCards.some((card) => card.templateId === cardTemplate.id)) {
        isMonsterCard = isMonster(cardTemplate);

        cardId = cardTemplate.id;
        name = i18next.t(`cards.${cardId}.name`);
        definition = isMonsterCard ? getCardDefinition(cardTemplate) : '';
        desc = i18next.t(`cards.${cardId}.desc`);
        attributeTexture = this._cardAttributeSheet.textures[`attr-${cardTemplate.attribute}`];
        raceTexture = this._cardRaceSheet.textures[`race-${cardTemplate.race}`];
        atk = cardTemplate.atk.toString();
        def = cardTemplate.def.toString();
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

      cardImage.filters = [this._hoverCardFilter];
      this._hoverCardSprite.visible = true;
      this._hoverCardSprite.position.set(x + cardView.x, (y + cardView.y) - 4);

      if (this._previewCardId !== cardId) {
        this._previewCardId = cardId;
        this._previewCardImage.texture = Assets.get(cardId ? `cards/images/${cardId}.png` : 'cards/card_backing.png');
        this._previewCardName.text = name;

        if (definition) {
          this._previewCardDesc1.text = definition;
          this._previewCardDesc2.text = desc;
        } else {
          this._previewCardDesc1.text = desc;
          this._previewCardDesc2.text = '';
        }

        this._previewCardAttribute.texture = attributeTexture;
        this._previewCardRace.texture = raceTexture;
        this._previewCardAtk.text = atk;
        this._previewCardDef.text = def;

        if (isMonsterCard) {
          this._previewCardScrollView.height = CARD_PREVIEW_MONSTER_SCROLL_HEIGHT;
          this._previewCardStatsContainer.visible = true;
        } else {
          this._previewCardScrollView.height = CARD_PREVIEW_SCROLL_HEIGHT;
          this._previewCardStatsContainer.visible = false;
        }
      }

      // Scrollbar handling
      const scrollDiff = this._previewCardScrollView.scrollHeight - this._previewCardScrollView.height;
      const scrollBarSlider = this._previewCardScrollBar.slider;

      scrollBarSlider.value = 0;
      scrollBarSlider.max = Math.max(scrollDiff, 1);
      scrollBarSlider.step = 0.01 * scrollBarSlider.max
      this._previewCardScrollBar.visible = scrollDiff > 0;
    };

    cardImage.onpointerleave = () => {
      cardImage.filters = null;
      this._hoverCardSprite.visible = false;
    };
  }

  private _playAudio(): void {
    this._track.play();
  }

  private _animateCardList(): Promise<void[]> {
    const cardViews = this._cardContainer.children;
    const startIndex = CARD_COLUMNS - 1;
    const cardData = this._cardData.slice((this._currenPageNum - 1) * CARDS_PER_PAGE, (this._currenPageNum - 1) * CARDS_PER_PAGE + CARDS_PER_PAGE);
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

          let textureSource: string;
          let isNew: boolean;

          if (this._ownedCards.some((card) => card.templateId === cardTemplate.id)) {
            textureSource = `cards/images/${cardTemplate.id}.png`;
            isNew = this._newCardTemplateIds.includes(cardTemplate.id);
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
    if (this._newIndicatorsUpdateInterval != null) {
      clearInterval(this._newIndicatorsUpdateInterval);
      this._newIndicatorsUpdateInterval = null;
    }

    this._newIndicatorsUpdateInterval = setInterval(() => {
      this.animate({
        from: 1,
        to: 0,
        repeat: 1,
        repeatType: 'reverse',
        duration: 400,
        onUpdate: (value: number) => {
          for (const cardView of this._cardContainer.children) {
            const newIndicator = cardView.children[1];
            newIndicator.alpha = value;
          }
        }
      });
    }, 2500);
  }

  private _startPagingTransition(forward: boolean): Promise<void[]> {
    const cardViews = this._cardContainer.children;
    const startIndex = forward ? (CARD_COLUMNS - 1) : 0;
    const cardData = this._cardData.slice((this._currenPageNum - 1) * CARDS_PER_PAGE, (this._currenPageNum - 1) * CARDS_PER_PAGE + CARDS_PER_PAGE);
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
              const cardTemplate = cardData[j];

              let textureSource: string;
              let isNew: boolean;

              if (this._ownedCards.some((card) => card.templateId === cardTemplate.id)) {
                textureSource = `cards/images/${cardTemplate.id}.png`;
                isNew = this._newCardTemplateIds.includes(cardTemplate.id);
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

if (import.meta.hot) {
  import.meta.hot.accept((newModule: any) => {
    if (newModule) {
      if (getNavigator().currentPage instanceof CardListPage) {
        getNavigator().navigate({
          createPage: () => new newModule.default()
        });
      }
    }
  });
}

export default CardListPage;