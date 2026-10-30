import { FancyButton, Slider } from '@pixi/ui';
import { Howl } from 'howler';
import i18next from 'i18next';
import * as log from 'loglevel';
import { AdjustmentFilter } from 'pixi-filters';
import { AnimatedSprite, Assets, BitmapText, Container, FederatedPointerEvent, Graphics, groupD8, Sprite, Spritesheet, Text, Texture, TextureSourceLike } from 'pixi.js';
import { client } from '../client';
import { SliderControls } from '../components/SliderControls';
import { CrossHatchFilter } from '../filter/CrossHatchFilter';
import { getCurrentLocale } from '../i18n';
import { getNavigator } from '../navigation';
import { ReceivablePacket } from '../network/ReceivablePacket';
import { SendablePacket } from '../network/SendablePacket';
import { CardType, ORDERED_CARD_TYPES, ORDERED_RACES } from '../template/CardStats';
import { CardTemplate, getCardAttributeIndex, getSpellTrapType, isMonster } from '../template/CardTemplate';
import { createRect, rotateTexture } from '../util/helpers';
import { BasePage } from './BasePage';
import MenuPage from './MenuPage';

const BAG_SLOTS = 10;

interface CardSlot {
  id: number;
  template: CardTemplate;
  isNew: boolean;
  count: number;
  deckLimit: number;
}

enum FilterBy {
  ALL,
  NORMAL,
  EFFECT,
  FUSION,
  SPELL,
  TRAP,
  RITUAL
}

const filterNames = [
  'all',
  'nor',
  'eff',
  'fus',
  'mag',
  'tra',
  'rit'
];

const filterCallbacks = [
  (value: CardSlot) => !!value,
  (value: CardSlot) => (value.template.type & CardType.MONSTER) === CardType.MONSTER,
  (value: CardSlot) => (value.template.type & CardType.EFFECT_MONSTER) === CardType.EFFECT_MONSTER,
  (value: CardSlot) => (value.template.type & CardType.FUSION_MONSTER) === CardType.FUSION_MONSTER,
  (value: CardSlot) => (value.template.type & CardType.SPELL) === CardType.SPELL,
  (value: CardSlot) => (value.template.type & CardType.TRAP) === CardType.TRAP,
  (value: CardSlot) => (value.template.type & CardType.RITUAL_MONSTER) === CardType.RITUAL_MONSTER,
];

enum SortBy {
  NAME,
  ATTACK,
  DEFENSE,
  RACE,
  ATTRIBUTE,
  STAR,
  TYPE
}

class DeckConstruction extends BasePage {
  private readonly mCardSlotDataset: CardSlot[] = [];
  private readonly mNewCardTmplIds: number[] = [];
  private readonly mEscapeKeyCb = (event: KeyboardEvent) => {
    if (event.code === 'Escape') {
      window.removeEventListener('keydown', this.mEscapeKeyCb);
      this._goBack();
    }
  };

  private mFilterCardSlotDataset: CardSlot[];

  private mBagContainer: Container;
  private mBagSlider: Slider;
  private mBagControls: Container;
  private mBagSlots: Container[];
  private mBagFilterLabel: Sprite;
  private mBagSortButton: FancyButton;
  private mIsBagFilterLabelVisible: boolean = true;
  private mIsOpeningBag: boolean = false;

  private mClickSound: Howl;
  private mBagOpenSound: Howl;
  private mTrack: Howl;

  private mHoverCardSprite: Sprite;
  private mHoverCardFilter: AdjustmentFilter;
  private mHoverCardTmpl: CardTemplate = null;

  private mCardTemplates: ReadonlyArray<CardTemplate>;
  private mBagFilterLabelSheet: Spritesheet;
  private mBagSortLabelSheet: Spritesheet;
  private mCardAttributeSheet: Spritesheet;
  private mCardRaceSheet: Spritesheet;
  private mSpellTrapTypeSheet: Spritesheet;
  private mDeckCardLimitSheet: Spritesheet;
  private mNewIndiSheet: Spritesheet;

  private mIsBagOpen: boolean = false;
  private mCurBagIdx: number = 0;

  private mBagFilterBy: FilterBy = FilterBy.ALL;
  private mBagSortBy: SortBy = SortBy.NAME;

  private mNewIndiUpdateInterval: ReturnType<typeof setInterval>;

  constructor() {
    super();
    this.eventMode = 'static';
  }

  async preload(): Promise<void> {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();

    await Assets.loadBundle(['cards', `${assetPrefix}/deck_c`]);

    const { default: cardData } = await import('../data/cardData.json');

    this.mCardTemplates = cardData;

    this.mBagFilterLabelSheet = Assets.get(`${assetPrefix}/deck_c/icon/icon_filter_${locale}.json`);
    this.mBagSortLabelSheet = Assets.get(`${assetPrefix}/deck_c/icon/icon_sort.json`);
    this.mCardAttributeSheet = Assets.get('commons/icon_attribute.json');
    this.mCardRaceSheet = Assets.get('commons/icon_race.json');
    this.mSpellTrapTypeSheet = Assets.get(`${assetPrefix}/deck_c/icon/icon_spelltrap.json`);
    this.mDeckCardLimitSheet = Assets.get(`${assetPrefix}/deck_c/icon/icon_limit.json`);
    this.mNewIndiSheet = Assets.get(`${assetPrefix}/deck_c/background/new_anime_${locale}.json`);
  }

  async onNavigatingTo(): Promise<void> {
    this.setPageInteraction(false);

    await this._init();
    await this._requestCardInventory();

    this._updateCardBagState();
    this._updateCardBagContent();
  }

  async onNavigatedTo(): Promise<void> {
    this._playAudio();
    this._attachInteractionListeners();

    this.setPageInteraction(true);

    if (this.mNewCardTmplIds.length > 0) {
      this._animateNewCardIndicators();
    }
  }

  async onNavigatingFrom(): Promise<void> {
    this.setPageInteraction(false);

    this.stopAllAnimations();

    if (this.mNewIndiUpdateInterval != null) {
      clearInterval(this.mNewIndiUpdateInterval);
      this.mNewIndiUpdateInterval = null;
    }

    window.removeEventListener('keydown', this.mEscapeKeyCb);
    this.mTrack.stop();
  }

  onNavigatedFrom(): void {
  }

  private async _init(): Promise<void> {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();

    this.addChild(
      ...<>
        <sprite texture={Texture.from(`${assetPrefix}/deck_c/background/background_l_${getCurrentLocale()}.png`)}></sprite>
        <sprite x={217} texture={Texture.from(`${assetPrefix}/deck_c/background/background_c.png`)}></sprite>
        <sprite x={583} texture={Texture.from(`${assetPrefix}/deck_c/background/above.png`)}></sprite>
        <sprite x={583} y={597} texture={Texture.from(`${assetPrefix}/deck_c/background/down.png`)}></sprite>
        <fancyButton afterCreate={(el: FancyButton) => el.once('click', () => {
          this.mClickSound.play();
          this._goBack();
        })} x={61} y={548} defaultView={<sprite alpha={0} texture={Texture.from(`${assetPrefix}/deck_c/background/back_1_${locale}.png`)}></sprite>}
        hoverView={`${assetPrefix}/deck_c/background/back_1_${locale}.png`} pressedView={`${assetPrefix}/deck_c/background/back_2_${locale}.png`}></fancyButton>
      </>
    );


    this._drawBag();
    this._drawBagScrollbar();
    this._drawHoverElements();

    this.mClickSound = new Howl({
      src: 'commons/decide.ogg'
    });
    this.mBagOpenSound = new Howl({
      src: 'commons/card_open.ogg'
    });
    this.mTrack = new Howl({
      src: `${assetPrefix}/deck_c/m_deck.ogg`,
      loop: true
    });
  }

  async _requestCardInventory(): Promise<void> {
    try {
      const responseBuffer = await client.getSocket().emitWithAck('cardInventoryRequest', new ArrayBuffer(0));
      const packet = new ReceivablePacket(responseBuffer);
      const length = packet.readInt32();

      for (let i = 0; i < length; i++) {
        const id = packet.readInt32();
        const templateId = packet.readInt32();
        const template = this.mCardTemplates.find((template) => template.id === templateId);

        if (!template) {
          log.warn(`Failed to find card template for ID ${templateId}!`);
          continue;
        }

        const isNew = !!packet.readInt8();
        if (isNew) {
          this.mNewCardTmplIds.push(templateId);
        }

        this.mCardSlotDataset.push({
          id,
          template,
          isNew: isNew,
          count: packet.readInt32(),
          deckLimit: packet.readInt8()
        });
      }
    } catch (err) {
      log.error(err instanceof Error ? err.message : err);
    }
  }

  private _updateCardBagState(): void {
    // Filter based on player preferences
    const cardSlotDataset = this.mCardSlotDataset.filter(filterCallbacks[this.mBagFilterBy]);
    const cardCount = cardSlotDataset.length;
    const comparator = this[`_bagSortComparator${this.mBagSortBy}`];

    // Sort based on player preferences
    if (comparator) {
      cardSlotDataset.sort(comparator);
    }

    // Reset scrolling
    this.mBagSlider.value = 0;
    this.mBagSlider.max = cardCount <= BAG_SLOTS ? 0 : cardCount - BAG_SLOTS;

    // Update filter and sorting indicators
    this.mBagFilterLabel.texture = this.mBagFilterLabelSheet.textures[`bag-filter-${this.mBagFilterBy}`];

    if (this.mBagSortButton.defaultView instanceof Sprite) {
      this.mBagSortButton.defaultView.texture = this.mBagSortLabelSheet.textures[`bag-sort-${this.mBagSortBy}`];
    }
    if (this.mBagSortButton.pressedView instanceof Sprite) {
      this.mBagSortButton.pressedView.texture = this.mBagSortLabelSheet.textures[`bag-sort-${this.mBagSortBy}-pressed`];
    }

    this.mFilterCardSlotDataset = cardSlotDataset;
  }

  private _updateCardBagContent(): void {
    const slots = this.mBagSlots;
    const cardSlotDataset = this.mFilterCardSlotDataset;
    const dataCount = cardSlotDataset.length;

    for (let i = 0, length = slots.length; i < length; i++) {
      const slot = slots[i];
      const cardInfo = slot.children[0];
      const basicDetails = slot.children[1] as Container<BitmapText>;
      const advancedDetails = slot.children[2];

      const cardImage = cardInfo.getChildByLabel('cardImage') as Sprite;
      const cardCount =  cardInfo.getChildByLabel('cardCount') as BitmapText;
      const cardLimit = cardInfo.getChildByLabel('cardLimit') as Sprite;
      const newIndi = cardInfo.getChildByLabel('newIndicator') as AnimatedSprite;
      const [basicAtkPoints, basicDefPoints] = basicDetails.children;
      const [cardName, advancedAtkPoints, divider, advancedDefPoints, cardAttribute, cardType, starIcon, starCount] = advancedDetails.children as [Text, BitmapText, BitmapText, BitmapText, Sprite, Sprite, Sprite, BitmapText];

      const slotData = cardSlotDataset[this.mCurBagIdx + i];

      // We have data
      if (dataCount > i) {
        const attributeIndex = getCardAttributeIndex(slotData.template);

        cardImage.texture = Assets.get(`cards/images/${slotData.template.id}.png`);
        cardCount.text = slotData.count;
        cardLimit.texture = this.mDeckCardLimitSheet.textures[`decklimit-${slotData.deckLimit}`];
        cardName.text = i18next.t(`cards.${slotData.template.id}.name`);
        cardAttribute.texture = attributeIndex >= 0 ? this.mCardAttributeSheet.textures[`attr-${attributeIndex}`] : null;

        if (slotData.isNew) {
          newIndi.visible = true;
          newIndi.play();
        } else {
          newIndi.gotoAndStop(0);
          newIndi.visible = false;
        }

        if (isMonster(slotData.template)) {
          const raceIndex = ORDERED_RACES.indexOf(slotData.template.race);

          advancedAtkPoints.text = slotData.template.atk;
          basicAtkPoints.text = slotData.template.atk;
          advancedDefPoints.text = slotData.template.def;
          basicDefPoints.text = slotData.template.def;
          starCount.text = slotData.template.level;

          cardType.texture = raceIndex >= 0 ? this.mCardRaceSheet.textures[`race-${raceIndex}`] : null;

          divider.visible = true;
          starIcon.visible = true;
        } else {
          advancedAtkPoints.text = '';
          basicAtkPoints.text = '';
          advancedDefPoints.text = '';
          basicDefPoints.text = '';
          starCount.text = '';

          cardType.texture = this.mSpellTrapTypeSheet.textures[`spelltrap-${getSpellTrapType(slotData.template)}`];

          divider.visible = false;
          starIcon.visible = false;
        }
      } else {
        // Cleanup section
        cardImage.texture = null;
        cardCount.text = '';
        cardLimit.texture = null;
        cardName.text = '';
        cardAttribute.texture = null;

        newIndi.gotoAndStop(0);
        newIndi.visible = false;

        advancedAtkPoints.text = '';
        basicAtkPoints.text = '';
        advancedDefPoints.text = '';
        basicDefPoints.text = '';
        starCount.text = '';

        cardType.texture = null;

        divider.visible = false;
        starIcon.visible = false;
      }
    }
  }

  private _registerCardClickListener(cardView: Container, index: number): void {
    const cardImage = cardView.getChildByLabel('cardImage');
    const newIndicator = cardView.getChildByLabel('newIndicator');

    cardImage.onclick = () => {
      if (this.mNewCardTmplIds.length == 0) {
        return;
      }

      const cardSlotDataset = this.mFilterCardSlotDataset;
      const slotData = cardSlotDataset[this.mCurBagIdx + index];

      const newIdx = this.mNewCardTmplIds.indexOf(slotData.template.id);
      if (newIdx > -1) {
        const sp = new SendablePacket();

        this.mNewCardTmplIds.splice(newIdx, 1);
        sp.writeInt32(slotData.id);

        try {
          client.getSocket().emit('clearCardNewStateRequest', sp.buffer);
          slotData.isNew = false;
          newIndicator.visible = false;

          if (this.mNewCardTmplIds.length === 0 && this.mNewIndiUpdateInterval != null) {
            clearInterval(this.mNewIndiUpdateInterval);
            this.mNewIndiUpdateInterval = null;
          }
        } catch (err) {
          // Re-add in case of failure
          slotData.isNew = true;
          this.mNewCardTmplIds.push(slotData.template.id);
          log.error(err instanceof Error ? err.message : err);
        }
      }
    };
  }

  private _registerCardHoverListener(cardView: Container, index: number): void {
    const { x, y } = cardView.parent;
    const cardImage = cardView.getChildByLabel('cardImage');

    cardImage.onpointerenter = () => {
      const cardSlotDataset = this.mFilterCardSlotDataset;
      const slotData = cardSlotDataset[this.mCurBagIdx + index];

      if (this.mHoverCardTmpl !== slotData.template) {
        this.mHoverCardTmpl = slotData.template;
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

  private _playAudio(): void {
    this.mTrack.play();
  }

  private _drawBag(): void {
    const assetPrefix = client.gameMode;

    const container = new Container();
    container.x = 580;

    const bagMask = createRect(580, 0, 192, 600, 'red');
    container.mask = bagMask;

    const bag = Sprite.from(`${assetPrefix}/deck_c/background/bag.png`);
    bag.x = 99;

    const bagToggleButton = this._createBagControlButton([
      `${assetPrefix}/deck_c/background/arrow_1.png`,
      `${assetPrefix}/deck_c/background/arrow_2.png`
    ]);
    bagToggleButton.position.set(107, 8);
    bagToggleButton.onclick = () => this._onBagButtonClick();

    const bagControls = this._createBagControls();
    bagControls.x = 139;
    bagControls.y = -39;

    const bagSlotContainer = this._createBagSlots();
    bagSlotContainer.position.set(110, 40);

    container.addChild(bag, bagToggleButton, bagControls, bagSlotContainer);
    this.addChild(container, bagMask);

    this.mBagContainer = container;
    this.mBagControls = bagControls;
    this.mBagSlots = bagSlotContainer.children;
  }

  private _createBagControlButton(textureSources: TextureSourceLike[]): FancyButton {
    const defaultTexture = Texture.from(textureSources[0]);
    const defaultView = Sprite.from(defaultTexture);

    defaultView.alpha = 0;

    const bagToggleButton = new FancyButton({
      defaultView: defaultView,
      hoverView: Sprite.from(defaultTexture),
      pressedView: Sprite.from(textureSources[1])
    });

    return bagToggleButton;
  }

  private _createBagControls(): Container {
    const assetPrefix = client.gameMode;
    const container = new Container();

    const controlsBg = Sprite.from(`${assetPrefix}/deck_c/background/filter_mini.png`);
    controlsBg.eventMode = 'static';

    container.addChild(controlsBg);

    const buttons = this._createBagFilterButtons();

    const filterLabel = Sprite.from(this.mBagFilterLabelSheet.textures[`bag-filter-${this.mBagFilterBy}`]);
    filterLabel.eventMode = 'none';
    filterLabel.anchor.set(0.5, 0.5);
    filterLabel.position.set(57, 20);

    const bagSortButton = new FancyButton({
      defaultView: Sprite.from(this.mBagSortLabelSheet.textures[`bag-sort-${this.mBagSortBy}`]),
      pressedView: Sprite.from(this.mBagSortLabelSheet.textures[`bag-sort-${this.mBagSortBy}-pressed`])
    });
    bagSortButton.position.set(114, 8);
    bagSortButton.onclick = (event: FederatedPointerEvent) => this._onCardBagSortClick(event);

    this.mBagFilterLabel = filterLabel;
    this.mBagSortButton = bagSortButton;

    container.addChild(...buttons, filterLabel, bagSortButton);

    return container;
  }

  private _createBagFilterButtons(): FancyButton[] {
    const assetPrefix = client.gameMode;
    const buttons: FancyButton[] = [];
    const onClickCallback = (event: FederatedPointerEvent) => this._onCardBagFilterClick(event);

    for (let i = 0, length = filterNames.length; i < length; i++) {
      const filterName = filterNames[i];
      const x = 8 + (i < 4 ? i : (i - 3)) * 25;
      const y = i < 4 ? 9 : 21;

      const button = this._createBagControlButton([
        `${assetPrefix}/deck_c/background/f_${filterName}_1.png`,
        `${assetPrefix}/deck_c/background/f_${filterName}_2.png`
      ]);
      button.label = `filter_${i}`;
      button.position.set(x, y);
      button.onclick = onClickCallback;

      buttons.push(button);
    }

    return buttons;
  }

  private _onCardBagFilterClick(event: FederatedPointerEvent): void {
    const button = event.currentTarget;
    const filterBy = parseInt(button.label.split('_')[1]);

    this.mClickSound.play();

    if (this.mBagFilterBy !== filterBy) {
      this.mBagFilterBy = filterBy;

      switch (this.mBagFilterBy) {
        case FilterBy.ALL:
        case FilterBy.SPELL:
        case FilterBy.TRAP:
          this.mBagSortBy = SortBy.NAME;
          break;
        default:
          this.mBagSortBy = SortBy.ATTACK;
          break;
      }
    } else {
      this._incrementSorting();
    }

    this._updateCardBagState();
    this._updateCardBagContent();
  }

  private _onCardBagSortClick(_event: FederatedPointerEvent): void {
    this.mClickSound.play();
    this._incrementSorting();
    this._updateCardBagState();
    this._updateCardBagContent();
  }

  private _incrementSorting(): void {
    switch (this.mBagFilterBy) {
      case FilterBy.SPELL:
      case FilterBy.TRAP:
        break;
      default:
        this.mBagSortBy = this.mBagSortBy >= SortBy.TYPE ? 0 : this.mBagSortBy + 1;
        break;
    }
  }

  private _createBagSlots(): Container {
    const container = new Container();

    for (let i = 0; i < BAG_SLOTS; i++) {
      const slot = this._createBagSlot();
      const cardInfo = slot.children[0];

      slot.y = i * 55;

      this._registerCardClickListener(cardInfo, i);
      this._registerCardHoverListener(cardInfo, i);
      container.addChild(slot);
    }

    return container;
  }

  private _createBagSlot(): Container {
    const slot = new Container();
    const cardInfo = new Container();

    const cardImage = Sprite.from('cards/card_backing.png');
    cardImage.label = 'cardImage';
    cardImage.eventMode = 'static';
    cardImage.setSize(35, 50);

    const cardCount = new BitmapText({
      style: {
        fontSize: 14,
        fontFamily: 'BagCardCount'
      },
    });
    cardCount.label = 'cardCount';
    cardCount.eventMode = 'none';
    cardCount.anchor.x = 1;
    cardCount.position.set(34, 35);

    const cardLimit = new Sprite();
    cardLimit.label = 'cardLimit';
    cardLimit.eventMode = 'none';
    cardLimit.anchor.set(0.5, 0.5);
    cardLimit.position.set(7, 7);

    const newIndicator = this._createNewIndicator();
    newIndicator.position.set(-1, 16);

    const basicDetails = this._createBagSlotBasicDetails();
    basicDetails.position.set(44, 0);

    const advancedDetails = this._createBagSlotAdvancedDetails();
    advancedDetails.position.set(44, 0);
    advancedDetails.visible = false;

    cardInfo.addChild(cardImage, cardCount, cardLimit, newIndicator);

    slot.addChild(cardInfo, basicDetails, advancedDetails);
    return slot;
  }

  private _createBagSlotBasicDetails(): Container<BitmapText> {
    const container = new Container<BitmapText>();

    const atkPoints = new BitmapText({
      style: {
        fontSize: 15,
        fontFamily: 'CardPoints'
      },
    });
    atkPoints.anchor.x = 1;
    atkPoints.position.set(24, 10);

    const defPoints = new BitmapText({
      style: {
        fontSize: 15,
        fontFamily: 'CardPoints'
      },
    });
    defPoints.anchor.x = 1;
    defPoints.position.set(24, 26);

    container.addChild(atkPoints, defPoints);

    return container;
  }

  private _createBagSlotAdvancedDetails(): Container {
    const assetPrefix = client.gameMode;
    const container = new Container();

    const name = new Text({
      style: {
        fontSize: 11,
        fontWeight: 'bold',
        fill: '#fdd941'
      }
    });
    name.position.y = 8;

    const atkPoints = new BitmapText({
      style: {
        fontSize: 15,
        fontFamily: 'CardPoints'
      },
    });
    atkPoints.anchor.x = 1;
    atkPoints.position.set(24, 26);

    const divider = new BitmapText({
      text: '/',
      style: {
        fontSize: 15,
        fontFamily: 'CardPoints'
      },
    });
    divider.visible = false;
    divider.position.set(24, 26);

    const defPoints = new BitmapText({
      style: {
        fontSize: 15,
        fontFamily: 'CardPoints'
      },
    });
    defPoints.anchor.x = 1;
    defPoints.position.set(54, 26);

    const cardAttribute = new Sprite();
    cardAttribute.position.set(62, 26);

    const cardType = new Sprite();
    cardType.position.set(78, 26);

    const starIcon = Sprite.from(`${assetPrefix}/deck_c/icon/icon_star.png`);
    starIcon.visible = false;
    starIcon.position.set(100, 26);

    const starCount = new BitmapText({
      style: {
        fontSize: 12,
        fontFamily: 'Star'
      },
    });
    starCount.position.set(120, 30);

    container.addChild(name, atkPoints, divider, defPoints, cardAttribute, cardType, starIcon, starCount);

    return container;
  }

  /**
   * 
   * @param hidden 
   */
  private _toggleBagFilterLabelVisibility(event: FederatedPointerEvent) {
    const eventPoint = this.mBagControls.toLocal(event.global);
    const hidden = eventPoint.x >= 3 && eventPoint.x <= 111 && eventPoint.y >= 0 && eventPoint.y <= 35;

    if (hidden) {
      if (this.mIsBagFilterLabelVisible) {
        this.mIsBagFilterLabelVisible = false;

        this.animate({
          from: 1,
          to: 0,
          duration: 400,
          onUpdate: (value: number) => {
            this.mBagFilterLabel.scale.set(value, value);
          }
        });
      }
    } else {
      if (!this.mIsBagFilterLabelVisible) {
        this.mIsBagFilterLabelVisible = true;

        this.animate({
          from: 0,
          to: 1,
          duration: 400,
          onUpdate: (value: number) => {
            this.mBagFilterLabel.scale.set(value, value);
          }
        });
      }
    }
  }

  private _createNewIndicator(): AnimatedSprite {
    const indicator = new AnimatedSprite(this.mNewIndiSheet.animations.news);
    indicator.label = 'newIndicator';
    indicator.animationSpeed = 0.1;
    indicator.eventMode = 'none';
    indicator.visible = false;

    return indicator;
  }

  private _drawBagScrollbar(): void {
    const assetPrefix = client.gameMode;

    const scrollBar = new SliderControls();
    scrollBar.position.set(767, 0);

    const scrollUpSprite = Sprite.from(`${assetPrefix}/deck_c/background/bag_up.png`);
    const scrollDownSprite = Sprite.from(`${assetPrefix}/deck_c/background/bag_down.png`);


    const scrollUpButton = new FancyButton({
      defaultView: createRect(0, 0, scrollUpSprite.width, scrollUpSprite.height),
      pressedView: scrollUpSprite,
    });
    scrollUpButton.position.set(8, 50);

    const scrollDownButton = new FancyButton({
      defaultView: createRect(0, 0, scrollDownSprite.width, scrollDownSprite.height),
      pressedView: scrollDownSprite,
    });
    scrollDownButton.position.set(8, 533);

    const sliderBg = Sprite.from(`${assetPrefix}/deck_c/background/right.png`);
    const scrollTrack = Sprite.from(rotateTexture(groupD8.S, `${assetPrefix}/deck_c/background/bag_bar.png`));
    const sliderDummyBg = createRect(0, 0, 404, 22);

    const slider = new Slider({
      bg: sliderDummyBg,
      fill: new Graphics(),
      slider: scrollTrack,
      min: 0,
      step: 1
    });
    slider.position.set(7, 98);
    slider.angle = 90;
    slider.pivot.set(0, 22);

    scrollBar.init({
      decreaseView: scrollUpButton,
      increaseView: scrollDownButton,
      slider,
      bg: sliderBg
    });

    slider.onUpdate.connect((value: number) => {
      this.mCurBagIdx = value;
      this._updateCardBagContent();
    });

    this.mBagSlider = slider;

    this.addChild(scrollBar);
  }

  private _drawHoverElements(): void {
    const assetPrefix = client.gameMode;
    const hoverSprite = Sprite.from(`${assetPrefix}/card_list/card_border_s.png`);

    hoverSprite.visible = false;
    hoverSprite.anchor.x = 0.5;
    hoverSprite.eventMode = 'none';

    this.addChild(hoverSprite);

    this.mHoverCardSprite = hoverSprite;
    this.mHoverCardFilter = new AdjustmentFilter({
      brightness: 1.3
    });
  }

  private async _goBack(): Promise<void> {
    await getNavigator().navigate({
      createPage: () => new MenuPage(),
      transition: {
        filters: [
          new CrossHatchFilter()
        ],
        duration: 1500
      }
    });
  }

  private _attachInteractionListeners(): void {
    this.onwheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        this.mBagSlider.value = this.mBagSlider.value - 1;
      } else {
        this.mBagSlider.value = this.mBagSlider.value + 1;
      }
    };

    this.onglobalpointermove = (event: FederatedPointerEvent) => this._toggleBagFilterLabelVisibility(event);
    window.addEventListener('keydown', this.mEscapeKeyCb);
  }

  private async _onBagButtonClick(): Promise<void> {
    if (this.mIsOpeningBag) {
      return;
    }

    this.mIsOpeningBag = true;
    this.mBagOpenSound.play();

    if (this.mIsBagOpen) {
      await this._toggleShowBagFilters(true);
    } else {
      // Expanding bag makes slots more detailed
      for (const slot of this.mBagSlots) {
        slot.children[1].visible = false;
        slot.children[2].visible = true;
      }
    }

    this.animate({
      from: this.mBagContainer.x,
      to: this.mIsBagOpen ? 580 : 481,
      duration: 300,
      onUpdate: (value: number) => {
        this.mBagContainer.x = value;
      },
      onComplete: async () => {
        if (this.mIsBagOpen) {
          // Collapsing back makes slots less detailed
          for (const slot of this.mBagSlots) {
            slot.children[1].visible = true;
            slot.children[2].visible = false;
          }
        } else {
          await this._toggleShowBagFilters(false);
        }

        this.mIsBagOpen = !this.mIsBagOpen;
        this.mIsOpeningBag = false;
      }
    });
  }

  private _toggleShowBagFilters(isBagOpen: boolean): Promise<void> {
    let from, to;

    if (isBagOpen) {
      from = 0;
      to = -this.mBagControls.height;
    } else {
      from = -this.mBagControls.height;
      to = 0;
    }

    const animation = this.animate({
      from,
      to,
      duration: 200,
      onUpdate: (value: number) => {
        this.mBagControls.y = value;
      },
      onComplete: () => {
        const pointer = client.getApplication().renderer.events.pointer;
        this._toggleBagFilterLabelVisibility(pointer);
      }
    });

    return animation.finished;
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
          for (const slot of this.mBagSlots) {
            const cardInfo = slot.children[0];
            const newIndicator = cardInfo.children[3] as AnimatedSprite;

            if (newIndicator.visible) {
              newIndicator.alpha = value;
            }
          }
        }
      });
    }, 2500);
  }

  private _bagSortComparator0(a: CardSlot, b: CardSlot): number {
    const val1 = i18next.t(`cards.${a.template.id}.name`);
    const val2 = i18next.t(`cards.${b.template.id}.name`);

    if (val1 < val2) {
      return -1;
    }
    if (val1 > val2) {
      return 1;
    }
    return 0;
  }

  private _bagSortComparator1(a: CardSlot, b: CardSlot): number {
    return b.template.atk - a.template.atk;
  }

  private _bagSortComparator2(a: CardSlot, b: CardSlot): number {
    return b.template.def - a.template.def;
  }

  private _bagSortComparator3(a: CardSlot, b: CardSlot): number {
    const val1 = ORDERED_RACES.indexOf(a.template.race);
    const val2 = ORDERED_RACES.indexOf(b.template.race);

    if (val1 < 0) {
      return 1;
    }

    if (val2 < 0) {
      return -1;
    }

    return val1 - val2;
  }

  private _bagSortComparator4(a: CardSlot, b: CardSlot): number {
    const val1 = getCardAttributeIndex(a.template);
    const val2 = getCardAttributeIndex(b.template);

    return val1 - val2;
  }

  private _bagSortComparator5(a: CardSlot, b: CardSlot): number {
    return b.template.level - a.template.level;
  }

  private _bagSortComparator6(a: CardSlot, b: CardSlot): number {
    const val1 = ORDERED_CARD_TYPES.indexOf(a.template.type);
    const val2 = ORDERED_CARD_TYPES.indexOf(b.template.type);

    return val1 - val2;
  }
}

export default DeckConstruction;