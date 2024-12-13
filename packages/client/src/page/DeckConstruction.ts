import { FancyButton, Slider } from '@pixi/ui';
import { Howl } from 'howler';
import i18next from 'i18next';
import * as log from 'loglevel';
import { AnimatedSprite, Assets, BitmapText, Container, FederatedPointerEvent, Graphics, groupD8, Sprite, Spritesheet, Text, Texture, TextureSourceLike } from 'pixi.js';
import { client } from '../client';
import { SliderControls } from '../components/SliderControls';
import { CrossHatchFilter } from '../filter/CrossHatchFilter';
import { getCurrentLocale } from '../i18n';
import { getNavigator } from '../navigation';
import { ReceivablePacket } from '../network/ReceivablePacket';
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
  private readonly _cardSlotDataset: CardSlot[] = [];
  private readonly _pointerMoveHandlers: Set<(event: FederatedPointerEvent) => void> = new Set();

  private _filteredCardSlotDataset: CardSlot[];

  private _backButton: FancyButton;

  private _bagContainer: Container;
  private _bagButton: FancyButton;
  private _bagSlider: Slider;
  private _bagControls: Container;
  private _bagSlots: Container[];
  private _bagFilterLabel: Sprite;
  private _bagSortButton: FancyButton;
  private _isBagFilterLabelVisible: boolean = true;

  private _clickSound: Howl;
  private _bagOpenSound: Howl;
  private _track: Howl;

  private _cardTemplates: ReadonlyArray<CardTemplate>;
  private _bagFilterLabelSheet: Spritesheet;
  private _bagSortLabelSheet: Spritesheet;
  private _cardAttributeSheet: Spritesheet;
  private _cardRaceSheet: Spritesheet;
  private _spellTrapTypeSheet: Spritesheet;
  private _deckCardLimitSheet: Spritesheet;
  private _newIndicatorSheet: Spritesheet;

  private _isBagOpen: boolean = false;
  private _currentBagIndex: number = 0;

  private _bagFilterBy: FilterBy = FilterBy.ALL;
  private _bagSortBy: SortBy = SortBy.NAME;

  private _newIndicatorsUpdateInterval: ReturnType<typeof setInterval>;

  constructor() {
    super();

    this.eventMode = 'static';
  }

  async preload(): Promise<void> {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();

    await Assets.loadBundle(['cards', `${assetPrefix}/deck_c`]);

    const { default: cardData } = await import('../data/cardData.json');

    this._cardTemplates = cardData;

    this._bagFilterLabelSheet = Assets.get(`${assetPrefix}/deck_c/icon/icon_filter_${locale}.json`);
    this._bagSortLabelSheet = Assets.get(`${assetPrefix}/deck_c/icon/icon_sort.json`);
    this._cardAttributeSheet = Assets.get('cards/icon_attribute.json');
    this._cardRaceSheet = Assets.get('cards/icon_race.json');
    this._spellTrapTypeSheet = Assets.get(`${assetPrefix}/deck_c/icon/icon_spelltrap.json`);
    this._deckCardLimitSheet = Assets.get(`${assetPrefix}/deck_c/icon/icon_limit.json`);
    this._newIndicatorSheet = Assets.get(`${assetPrefix}/deck_c/background/new_anime_${locale}.json`);
  }

  async onNavigatedTo(): Promise<void> {
    const hasNewCards = this._cardSlotDataset.some((slotData) => slotData.isNew);

    this._addEscapeKeyListener();
    this._playAudio();
    this._attachInteractionListeners();

    if (hasNewCards) {
      this._animateNewCardIndicators();
    }
  }

  async onNavigatingTo(): Promise<void> {
    await this._init();
    await this._requestCardInventory();

    this._updateCardBagState();
    this._updateCardBagContent();
  }

  async onNavigatingFrom(): Promise<void> {
    this.stopAllAnimations();

    if (this._newIndicatorsUpdateInterval != null) {
      clearInterval(this._newIndicatorsUpdateInterval);
      this._newIndicatorsUpdateInterval = null;
    }

    this._track.stop();
  }

  onNavigatedFrom(): void {
  }

  private async _init(): Promise<void> {
    const assetPrefix = client.gameMode;

    this._drawBackground();
    this._drawBackButton();
    this._drawBag();
    this._drawBagScrollbar();

    this._clickSound = new Howl({
      src: 'commons/decide.ogg'
    });
    this._bagOpenSound = new Howl({
      src: 'commons/card_open.ogg'
    });
    this._track = new Howl({
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
        const template = this._cardTemplates.find((template) => template.id === templateId);

        if (!template) {
          log.warn(`Failed to find card template for ID ${templateId}!`);
          continue;
        }

        this._cardSlotDataset.push({
          id,
          template,
          isNew: packet.readInt8() === 1,
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
    const cardSlotDataset = this._cardSlotDataset.filter(filterCallbacks[this._bagFilterBy]);
    const cardCount = cardSlotDataset.length;
    const comparator = this[`_bagSortComparator${this._bagSortBy}`];

    // Sort based on player preferences
    if (comparator) {
      cardSlotDataset.sort(comparator);
    }

    // Reset scrolling
    this._bagSlider.value = 0;
    this._bagSlider.max = cardCount <= BAG_SLOTS ? 0 : cardCount - BAG_SLOTS;

    // Update filter and sorting indicators
    this._bagFilterLabel.texture = this._bagFilterLabelSheet.textures[`bag-filter-${this._bagFilterBy}`];

    if (this._bagSortButton.defaultView instanceof Sprite) {
      this._bagSortButton.defaultView.texture = this._bagSortLabelSheet.textures[`bag-sort-${this._bagSortBy}`];
    }
    if (this._bagSortButton.pressedView instanceof Sprite) {
      this._bagSortButton.pressedView.texture = this._bagSortLabelSheet.textures[`bag-sort-${this._bagSortBy}-pressed`];
    }

    this._filteredCardSlotDataset = cardSlotDataset;
  }

  private _updateCardBagContent(): void {
    const slots = this._bagSlots;
    const cardSlotDataset = this._filteredCardSlotDataset;
    const dataCount = cardSlotDataset.length;

    for (let i = 0, length = slots.length; i < length; i++) {
      const slot = slots[i];
      const cardInfo = slot.children[0];
      const basicDetails = slot.children[1] as Container<BitmapText>;
      const advancedDetails = slot.children[2];

      const [cardImage, cardCount, cardLimit, newIndicator] = cardInfo.children as [Sprite, BitmapText, Sprite, AnimatedSprite];
      const [basicAtkPoints, basicDefPoints] = basicDetails.children;
      const [cardName, advancedAtkPoints, divider, advancedDefPoints, cardAttribute, cardType, starIcon, starCount] = advancedDetails.children as [Text, BitmapText, BitmapText, BitmapText, Sprite, Sprite, Sprite, BitmapText];

      const slotData = cardSlotDataset[this._currentBagIndex + i];

      // We have data
      if (dataCount > i) {
        const attributeIndex = getCardAttributeIndex(slotData.template);

        cardImage.texture = Assets.get(`cards/images/${slotData.template.id}.png`);
        cardCount.text = slotData.count;
        cardLimit.texture = this._deckCardLimitSheet.textures[`decklimit-${slotData.deckLimit}`];
        cardName.text = i18next.t(`cards.${slotData.template.id}.name`);
        cardAttribute.texture = attributeIndex >= 0 ? this._cardAttributeSheet.textures[`attr-${attributeIndex}`] : null;

        if (slotData.isNew) {
          newIndicator.visible = true;
          newIndicator.play();
        } else {
          newIndicator.gotoAndStop(0);
          newIndicator.visible = false;
        }

        if (isMonster(slotData.template)) {
          const raceIndex = ORDERED_RACES.indexOf(slotData.template.race);

          advancedAtkPoints.text = slotData.template.atk;
          basicAtkPoints.text = slotData.template.atk;
          advancedDefPoints.text = slotData.template.def;
          basicDefPoints.text = slotData.template.def;
          starCount.text = slotData.template.level;

          cardType.texture = raceIndex >= 0 ? this._cardRaceSheet.textures[`race-${raceIndex}`] : null;

          divider.visible = true;
          starIcon.visible = true;
        } else {
          advancedAtkPoints.text = '';
          basicAtkPoints.text = '';
          advancedDefPoints.text = '';
          basicDefPoints.text = '';
          starCount.text = '';

          cardType.texture = this._spellTrapTypeSheet.textures[`spelltrap-${getSpellTrapType(slotData.template)}`];

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

        newIndicator.gotoAndStop(0);
        newIndicator.visible = false;

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

  private _playAudio(): void {
    this._track.play();
  }

  private _drawBackground(): void {
    const assetPrefix = client.gameMode;

    const bgLeft = Sprite.from(`${assetPrefix}/deck_c/background/background_l_${getCurrentLocale()}.png`);

    const bgCenter = Sprite.from(`${assetPrefix}/deck_c/background/background_c.png`);
    bgCenter.x = 217;

    const bagAbove = Sprite.from(`${assetPrefix}/deck_c/background/above.png`);
    bagAbove.x = 583;

    const bagBelow = Sprite.from(`${assetPrefix}/deck_c/background/down.png`);
    bagBelow.position.set(583, 597);

    this.addChild(bgLeft, bgCenter, bagAbove, bagBelow);
  }

  private _drawBackButton(): void {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();

    const defaultView = Sprite.from(`${assetPrefix}/deck_c/background/back_1_${locale}.png`);
    defaultView.alpha = 0;

    const backButton = new FancyButton({
      defaultView,
      hoverView: `${assetPrefix}/deck_c/background/back_1_${locale}.png`,
      pressedView: `${assetPrefix}/deck_c/background/back_2_${locale}.png`
    });
    backButton.position.set(61, 548);

    this.addChild(backButton);
    this._backButton = backButton;
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

    const bagControls = this._createBagControls();
    bagControls.x = 139;
    bagControls.y = -39;

    const bagSlotContainer = this._createBagSlots();
    bagSlotContainer.position.set(110, 40);

    container.addChild(bag, bagToggleButton, bagControls, bagSlotContainer);
    this.addChild(container, bagMask);

    this._bagContainer = container;
    this._bagButton = bagToggleButton;
    this._bagControls = bagControls;
    this._bagSlots = bagSlotContainer.children;
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

    const filterLabel = Sprite.from(this._bagFilterLabelSheet.textures[`bag-filter-${this._bagFilterBy}`]);
    filterLabel.eventMode = 'none';
    filterLabel.anchor.set(0.5, 0.5);
    filterLabel.position.set(57, 20);

    const bagSortButton = new FancyButton({
      defaultView: Sprite.from(this._bagSortLabelSheet.textures[`bag-sort-${this._bagSortBy}`]),
      pressedView: Sprite.from(this._bagSortLabelSheet.textures[`bag-sort-${this._bagSortBy}-pressed`])
    });
    bagSortButton.position.set(114, 8);
    bagSortButton.onclick = (event: FederatedPointerEvent) => this._onCardBagSortClick(event);

    this._pointerMoveHandlers.add((event: FederatedPointerEvent) => this._toggleBagFilterLabelVisibility(event));

    this._bagFilterLabel = filterLabel;
    this._bagSortButton = bagSortButton;

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

    this._clickSound.play();

    if (this._bagFilterBy !== filterBy) {
      this._bagFilterBy = filterBy;

      switch (this._bagFilterBy) {
        case FilterBy.ALL:
        case FilterBy.SPELL:
        case FilterBy.TRAP:
          this._bagSortBy = SortBy.NAME;
          break;
        default:
          this._bagSortBy = SortBy.ATTACK;
          break;
      }
    } else {
      this._incrementSorting();
    }

    this._updateCardBagState();
    this._updateCardBagContent();
  }

  private _onCardBagSortClick(_event: FederatedPointerEvent): void {
    this._clickSound.play();
    this._incrementSorting();
    this._updateCardBagState();
    this._updateCardBagContent();
  }

  private _incrementSorting(): void {
    switch (this._bagFilterBy) {
      case FilterBy.SPELL:
      case FilterBy.TRAP:
        break;
      default:
        this._bagSortBy = this._bagSortBy >= SortBy.TYPE ? 0 : this._bagSortBy + 1;
        break;
    }
  }

  private _createBagSlots(): Container {
    const container = new Container();

    for (let i = 0; i < BAG_SLOTS; i++) {
      const slot = this._createBagSlot();
      slot.y = i * 55;
      container.addChild(slot);
    }

    return container;
  }

  private _createBagSlot(): Container {
    const slot = new Container();

    const cardInfo = new Container();

    const cardImage = Sprite.from('cards/card_backing.png');
    cardImage.setSize(35, 50);

    const cardCount = new BitmapText({
      style: {
        fontSize: 14,
        fontFamily: 'BagCardCount'
      },
    });
    cardCount.eventMode = 'none';
    cardCount.anchor.x = 1;
    cardCount.position.set(34, 35);

    const cardLimit = new Sprite();
    cardLimit.eventMode = 'none';
    cardLimit.anchor.set(0.5, 0.5);
    cardLimit.position.set(7, 7);

    const newIndicator = this._createNewIndicator();
    newIndicator.visible = false;
    newIndicator.eventMode = 'none';
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
    const eventPoint = this._bagControls.toLocal(event.global);
    const hidden = eventPoint.x >= 3 && eventPoint.x <= 111 && eventPoint.y >= 0 && eventPoint.y <= 35;

    if (hidden) {
      if (this._isBagFilterLabelVisible) {
        this._isBagFilterLabelVisible = false;

        this.animate({
          from: 1,
          to: 0,
          duration: 400,
          onUpdate: (value: number) => {
            this._bagFilterLabel.scale.set(value, value);
          }
        });
      }
    } else {
      if (!this._isBagFilterLabelVisible) {
        this._isBagFilterLabelVisible = true;

        this.animate({
          from: 0,
          to: 1,
          duration: 400,
          onUpdate: (value: number) => {
            this._bagFilterLabel.scale.set(value, value);
          }
        });
      }
    }
  }

  private _createNewIndicator(): AnimatedSprite {
    const indicator = new AnimatedSprite(this._newIndicatorSheet.animations.news);
    indicator.animationSpeed = 0.1;
    indicator.eventMode = 'none';

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
      this._currentBagIndex = value;
      this._updateCardBagContent();
    });

    this._bagSlider = slider;

    this.addChild(scrollBar);
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
    let isOpeningBag = false;

    this._backButton.onclick = async () => {
      this._clickSound.play();
      await this._goBack();
    };


    this.onwheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        this._bagSlider.value = this._bagSlider.value - 1;
      } else {
        this._bagSlider.value = this._bagSlider.value + 1;
      }
    };

    this.onglobalpointermove = (event: FederatedPointerEvent) => {
      for (const handler of this._pointerMoveHandlers) {
        handler(event);
      }
    };

    this._bagButton.onclick = async () => {
      if (isOpeningBag) {
        return;
      }

      isOpeningBag = true;

      this._bagOpenSound.play();

      if (this._isBagOpen) {
        await this._toggleShowBagFilters(true);
      } else {
        // Expanding bag makes slots more detailed
        for (const slot of this._bagSlots) {
          slot.children[1].visible = false;
          slot.children[2].visible = true;
        }
      }

      this.animate({
        from: this._bagContainer.x,
        to: this._isBagOpen ? 580 : 481,
        duration: 300,
        onUpdate: (value: number) => {
          this._bagContainer.x = value;
        },
        onComplete: async () => {
          if (this._isBagOpen) {
            // Collapsing back makes slots less detailed
            for (const slot of this._bagSlots) {
              slot.children[1].visible = true;
              slot.children[2].visible = false;
            }
          } else {
            await this._toggleShowBagFilters(false);
          }

          this._isBagOpen = !this._isBagOpen;
          isOpeningBag = false;
        }
      });
    };
  }

  private _toggleShowBagFilters(isBagOpen: boolean): Promise<void> {
    let from, to;

    if (isBagOpen) {
      from = 0;
      to = -this._bagControls.height;
    } else {
      from = -this._bagControls.height;
      to = 0;
    }

    const animation = this.animate({
      from,
      to,
      duration: 200,
      onUpdate: (value: number) => {
        this._bagControls.y = value;
      },
      onComplete: () => {
        const pointer = client.getApplication().renderer.events.pointer;
        this._toggleBagFilterLabelVisibility(pointer);
      }
    });

    return animation.finished;
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
          for (const slot of this._bagSlots) {
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

  private _addEscapeKeyListener(): void {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        window.removeEventListener('keydown', onKeyDown);
        this._goBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
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

if (import.meta.hot) {
  import.meta.hot.accept((newModule: any) => {
    if (newModule) {
      if (getNavigator().currentPage instanceof DeckConstruction) {
        getNavigator().navigate({
          createPage: () => new newModule.default()
        });
      }
    }
  });
}

export default DeckConstruction;