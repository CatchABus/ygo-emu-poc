import { FancyButton, Slider } from '@pixi/ui';
import { Howl } from 'howler';
import { AnimatedSprite, Assets, BitmapText, Container, Graphics, groupD8, Sprite, Spritesheet, Text } from 'pixi.js';
import { getNavigator } from '../navigation';
import { BasePage } from './BasePage';
import { getCurrentLocale } from '../i18n';
import MenuPage from './MenuPage';
import { CrossHatchFilter } from '../filter/CrossHatchFilter';
import { SliderControls } from '../components/SliderControls';
import { HoverPressButton } from '../components/HoverPressButton';
import { ReceivablePacket } from '../network/ReceivablePacket';
import { CardTemplate, getCardAttributeString, getSpellTrapType, isMonster } from '../template/CardTemplate';
import { rotateTexture } from '../util/helpers';
import i18next from 'i18next';
import { client } from '../client';

const BAG_SLOTS = 10;

interface CardSlot {
  id: number;
  templateId: number;
  isNew: boolean;
  count: number;
  deckLimit: number;
}

class DeckConstruction extends BasePage {
  private readonly _cardSlotDataset: CardSlot[] = [];

  private _backButton: FancyButton;

  private _bagContainer: Container;
  private _bagButton: FancyButton;
  private _bagSlider: Slider;
  private _bagFilters: Container;
  private _bagSlots: Container[];

  private _clickSound: Howl;
  private _bagOpenSound: Howl;
  private _track: Howl;

  private _cardData: CardTemplate[];
  private _cardAttributeSheet: Spritesheet;
  private _cardRaceSheet: Spritesheet;
  private _spellTrapTypeSheet: Spritesheet;
  private _deckCardLimitSheet: Spritesheet;
  private _newIndicatorSheet: Spritesheet;

  private _isBagOpen: boolean = false;
  private _currentBagIndex: number = 0;

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

    this._cardData = cardData;

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

    this._bagSlider.max = this._cardSlotDataset.length <= BAG_SLOTS ? 0 : this._cardSlotDataset.length - BAG_SLOTS;
    this._updateCardBag();
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
    const responseBuffer = await client.getSocket().emitWithAck('cardInventoryRequest', new ArrayBuffer(0));
    const packet = new ReceivablePacket(responseBuffer);
    const length = packet.readInt32();

    for (let i = 0; i < length; i++) {
      this._cardSlotDataset.push({
        id: packet.readInt32(),
        templateId: packet.readInt32(),
        isNew: packet.readInt8() === 1,
        count: packet.readInt32(),
        deckLimit: packet.readInt8()
      });
    }
  }

  _updateCardBag(): void {
    const slots = this._bagSlots;
    const dataCount = this._cardSlotDataset.length;

    for (let i = 0, length = slots.length; i < length; i++) {
      if (dataCount <= (i + 1)) {
        break;
      }

      const slot = slots[i];
      const [cardInfo, basicDetails, advancedDetails] = slot.children as [Container, Container<BitmapText>, Container];
      const [cardImage, cardCount, cardLimit, newIndicator] = cardInfo.children as [Sprite, BitmapText, Sprite, AnimatedSprite];
      const [basicAtkPoints, basicDefPoints] = basicDetails.children;
      const [cardName, advancedAtkPoints, divider, advancedDefPoints, cardAttribute, cardType, starIcon, starCount] = advancedDetails.children as [Text, BitmapText, BitmapText, BitmapText, Sprite, Sprite, Sprite, BitmapText];

      const slotData = this._cardSlotDataset[this._currentBagIndex + i];
      const template = this._cardData.find(template => template.id === slotData.templateId);

      cardImage.texture = Assets.get(`cards/images/${slotData.templateId}.png`);
      cardCount.text = slotData.count;
      cardLimit.texture = this._deckCardLimitSheet.textures[`decklimit-${slotData.deckLimit}`];
      cardName.text = i18next.t(`cards.${slotData.templateId}.name`);
      cardAttribute.texture = this._cardAttributeSheet.textures[`attr-${getCardAttributeString(template)}`];

      if (slotData.isNew) {
        newIndicator.visible = true;
        newIndicator.play();
      } else {
        newIndicator.gotoAndStop(0);
        newIndicator.visible = false;
      }

      if (isMonster(template)) {
        advancedAtkPoints.text = template.atk;
        basicAtkPoints.text = template.atk;
        advancedDefPoints.text = template.def;
        basicDefPoints.text = template.def;
        starCount.text = template.level;

        cardType.texture = this._cardRaceSheet.textures[`race-${template.race}`];

        divider.visible = true;
        starIcon.visible = true;
      } else {
        advancedAtkPoints.text = '';
        basicAtkPoints.text = '';
        advancedDefPoints.text = '';
        basicDefPoints.text = '';
        starCount.text = '';

        cardType.texture = this._spellTrapTypeSheet.textures[`spelltrap-${getSpellTrapType(template)}`];

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

    const bagMask = new Graphics().rect(580, 0, 192, 600).fill('red');
    container.mask = bagMask;

    const bag = Sprite.from(`${assetPrefix}/deck_c/background/bag.png`);
    bag.x = 99;

    const bagToggleButton = this._createBagButton();
    bagToggleButton.position.set(107, 8);

    const bagFilters = this._createBagFilters();
    bagFilters.x = 139;
    bagFilters.y = -39;

    const bagSlotContainer = this._createBagSlots();
    bagSlotContainer.position.set(110, 40);

    container.addChild(bag, bagToggleButton, bagFilters, bagSlotContainer);
    this.addChild(container, bagMask);

    this._bagContainer = container;
    this._bagButton = bagToggleButton;
    this._bagFilters = bagFilters;
    this._bagSlots = bagSlotContainer.children;
  }

  private _createBagButton(): FancyButton {
    const assetPrefix = client.gameMode;

    const defaultView = Sprite.from(`${assetPrefix}/deck_c/background/arrow_1.png`);
    defaultView.alpha = 0;

    const bagToggleButton = new FancyButton({
      defaultView,
      hoverView: `${assetPrefix}/deck_c/background/arrow_1.png`,
      pressedView: `${assetPrefix}/deck_c/background/arrow_2.png`
    });

    return bagToggleButton;
  }

  private _createBagFilters(): Container {
    const assetPrefix = client.gameMode;

    const container = new Container();
    const filterBg = Sprite.from(`${assetPrefix}/deck_c/background/filter_mini.png`);

    container.addChild(filterBg);

    return container;
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

    const scrollUpButton = new HoverPressButton({
      pressedView: `${assetPrefix}/deck_c/background/bag_up.png`,
    });
    scrollUpButton.position.set(8, 50);

    const scrollDownButton = new HoverPressButton({
      pressedView: `${assetPrefix}/deck_c/background/bag_down.png`,
    });
    scrollDownButton.position.set(8, 533);

    const sliderBg = Sprite.from(`${assetPrefix}/deck_c/background/right.png`);
    const scrollTrack = Sprite.from(rotateTexture(groupD8.S, `${assetPrefix}/deck_c/background/bag_bar.png`));
    const sliderDummyBg = new Graphics().rect(0, 0, 404, 22)
      .fill('transparent');

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
      this._updateCardBag();
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
      to = -this._bagFilters.height;
    } else {
      from = -this._bagFilters.height;
      to = 0;
    }

    const animation = this.animate({
      from,
      to,
      duration: 200,
      onUpdate: (value: number) => {
        this._bagFilters.y = value;
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