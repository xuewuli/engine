/****************************************************************************
 Copyright (c) 2013-2016 Chukong Technologies Inc.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and  non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Chukong Aipu reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

const renderer = require('../renderer');
const renderEngine = require('../renderer/render-engine');
const gfx = renderEngine.gfx;
const SpriteMaterial = renderEngine.SpriteMaterial;
const SpriteModel = renderEngine.SpriteModel;
const SlicedModel = renderEngine.SlicedModel;

/**
 * !#en Enum for sprite type.
 * !#zh Sprite 类型
 * @enum Sprite.SpriteType
 */
var SpriteType = cc.Enum({
    /**
     * !#en The simple type.
     * !#zh 普通类型
     * @property {Number} SIMPLE
     */
    SIMPLE: 0,
    /**
     * !#en The sliced type.
     * !#zh 切片（九宫格）类型
     * @property {Number} SLICED
     */
    SLICED: 1,
    /*
     * !#en The tiled type.
     * !#zh 平铺类型
     * @property {Number} TILED
     */
    TILED: 2,
    /*
     * !#en The filled type.
     * !#zh 填充类型
     * @property {Number} FILLED
     */
    FILLED: 3,
    /*
     * !#en The mesh type.
     * !#zh 以 Mesh 三角形组成的类型
     * @property {Number} MESH
     */
    MESH: 4
});

/**
 * !#en Enum for fill type.
 * !#zh 填充类型
 * @enum Sprite.FillType
 */
var FillType = cc.Enum({
    /**
     * !#en The horizontal fill.
     * !#zh 水平方向填充
     * @property {Number} HORIZONTAL
     */
    HORIZONTAL: 0,
    /**
     * !#en The vertical fill.
     * !#zh 垂直方向填充
     * @property {Number} VERTICAL
     */
    VERTICAL: 1,
    /**
     * !#en The radial fill.
     * !#zh 径向填充
     * @property {Number} RADIAL
     */
    RADIAL:2,
});

var BlendFactor = cc.BlendFunc.BlendFactor;

/**
 * !#en Sprite Size can track trimmed size, raw size or none.
 * !#zh 精灵尺寸调整模式
 * @enum Sprite.SizeMode
 */
var SizeMode = cc.Enum({
    /**
     * !#en Use the customized node size.
     * !#zh 使用节点预设的尺寸
     * @property {Number} CUSTOM
     */
    CUSTOM: 0,
    /**
     * !#en Match the trimmed size of the sprite frame automatically.
     * !#zh 自动适配为精灵裁剪后的尺寸
     * @property {Number} TRIMMED
     */
    TRIMMED: 1,
    /**
     * !#en Match the raw size of the sprite frame automatically.
     * !#zh 自动适配为精灵原图尺寸
     * @property {Number} RAW
     */
    RAW: 2
});

var State = cc.Enum({
    /**
     * !#en The normal state
     * !#zh 正常状态
     * @property {Number} NORMAL
     */
    NORMAL: 0,
    /**
     * !#en The gray state, all color will be modified to grayscale value.
     * !#zh 灰色状态，所有颜色会被转换成灰度值
     * @property {Number} GRAY
     */
    GRAY: 1,
    /**
     * !#en The distortion state
     * !#zh 畸变状态
     * @property {Number} DISTORTION
     */
    DISTORTION: 2
});

/**
 * !#en Renders a sprite in the scene.
 * !#zh 该组件用于在场景中渲染精灵。
 * @class Sprite
 * @extends Component
 * @example
 *  // Create a new node and add sprite components.
 *  var node = new cc.Node("New Sprite");
 *  var sprite = node.addComponent(cc.Sprite);
 *  node.parent = this.node;
 */
var Sprite = cc.Class({
    name: 'cc.Sprite',
    extends: cc.Component,

    editor: CC_EDITOR && {
        menu: 'i18n:MAIN_MENU.component.renderers/Sprite',
        help: 'i18n:COMPONENT.help_url.sprite',
        inspector: 'packages://inspector/inspectors/comps/sprite.js',
    },

    ctor: function() {
        this._material = null;
        this._customMaterial = false;
        this._model = null;
    },

    properties: {
        _spriteFrame: {
            default: null,
            type: cc.SpriteFrame
        },
        _type: SpriteType.SIMPLE,
        _sizeMode: SizeMode.TRIMMED,
        _fillType: 0,
        _fillCenter: cc.v2(0,0),
        _fillStart: 0,
        _fillRange: 0,
        _isTrimmedMode: true,
        _state: 0,
        _srcBlendFactor: BlendFactor.SRC_ALPHA,
        _dstBlendFactor: BlendFactor.ONE_MINUS_SRC_ALPHA,
        _atlas: {
            default: null,
            type: cc.SpriteAtlas,
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.atlas',
            editorOnly: true,
            visible: true,
            animatable: false
        },

        /**
         * !#en The sprite frame of the sprite.
         * !#zh 精灵的精灵帧
         * @property spriteFrame
         * @type {SpriteFrame}
         * @example
         * sprite.spriteFrame = newSpriteFrame;
         */
        spriteFrame: {
            get: function () {
                return this._spriteFrame;
            },
            set: function (value, force) {
                var lastSprite = this._spriteFrame;
                if (CC_EDITOR) {
                    if (!force && ((lastSprite && lastSprite._uuid) === (value && value._uuid))) {
                        return;
                    }
                }
                else {
                    if (lastSprite === value) {
                        return;
                    }
                }
                this._spriteFrame = value;
                if (lastSprite && lastSprite.getTexture() !== value.getTexture()) {
                    // Drop previous material, because texture have changed
                    this._material = null;
                    this._customMaterial = false;
                }
                this._applySpriteFrame(lastSprite);
                if (CC_EDITOR) {
                    this.node.emit('spriteframe-changed', this);
                }
            },
            type: cc.SpriteFrame,
        },

        /**
         * !#en The sprite render type.
         * !#zh 精灵渲染类型
         * @property type
         * @type {Sprite.Type}
         * @example
         * sprite.type = cc.Sprite.Type.SIMPLE;
         */
        type: {
            get: function () {
                return this._type;
            },
            set: function (value) {
                if (this._type !== value) {
                    this._removeModel();
                    this._type = value;
                    this._activateModel();
                }
            },
            type: SpriteType,
            animatable: false,
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.type',
        },

        /**
         * !#en
         * The fill type, This will only have any effect if the "type" is set to “cc.Sprite.Type.FILLED”.
         * !#zh
         * 精灵填充类型，仅渲染类型设置为 cc.Sprite.Type.FILLED 时有效。
         * @property fillType
         * @type {Sprite.FillType}
         * @example
         * sprite.fillType = cc.Sprite.FillType.HORIZONTAL;
         */
        fillType : {
            get: function () {
                return this._fillType;
            },
            set: function(value) {
                this._fillType = value;
                if (this._type === SpriteType.FILLED && this._model) {
                    this._model.setFillType(value);
                }
            },
            type: FillType,
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.fill_type'
        },

        /**
         * !#en
         * The fill Center, This will only have any effect if the "type" is set to “cc.Sprite.Type.FILLED”.
         * !#zh
         * 填充中心点，仅渲染类型设置为 cc.Sprite.Type.FILLED 时有效。
         * @property fillCenter
         * @type {Vec2}
         * @example
         * sprite.fillCenter = new cc.Vec2(0, 0);
         */
        fillCenter: {
            get: function() {
                return this._fillCenter;
            },
            set: function(value) {
                this._fillCenter = cc.v2(value);
                if (this._type === SpriteType.FILLED && this._model) {
                    this._model.setFillCenter(this._fillCenter);
                }
            },
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.fill_center',
        },

        /**
         * !#en
         * The fill Start, This will only have any effect if the "type" is set to “cc.Sprite.Type.FILLED”.
         * !#zh
         * 填充起始点，仅渲染类型设置为 cc.Sprite.Type.FILLED 时有效。
         * @property fillStart
         * @type {Number}
         * @example
         * // -1 To 1 between the numbers
         * sprite.fillStart = 0.5;
         */
        fillStart: {
            get: function() {
                return this._fillStart;
            },
            set: function(value) {
                this._fillStart = cc.clampf(value, -1, 1);
                if (this._type === SpriteType.FILLED && this._model) {
                    this._model.setFillStart(this._fillStart);
                }
            },
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.fill_start'
        },

        /**
         * !#en
         * The fill Range, This will only have any effect if the "type" is set to “cc.Sprite.Type.FILLED”.
         * !#zh
         * 填充范围，仅渲染类型设置为 cc.Sprite.Type.FILLED 时有效。
         * @property fillRange
         * @type {Number}
         * @example
         * // -1 To 1 between the numbers
         * sprite.fillRange = 1;
         */
        fillRange: {
            get: function() {
                return this._fillRange;
            },
            set: function(value) {
                this._fillRange = cc.clampf(value, -1, 1);
                if (this._type === SpriteType.FILLED && this._model) {
                    this._model.setFillRange(this._fillRange);
                }
            },
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.fill_range'
        },
        /**
         * !#en specify the frame is trimmed or not.
         * !#zh 是否使用裁剪模式
         * @property trim
         * @type {Boolean}
         * @example
         * sprite.trim = true;
         */
        trim: {
            get: function () {
                return this._isTrimmedMode;
            },
            set: function (value) {
                if (this._isTrimmedMode !== value) {
                    this._isTrimmedMode = value;
                    if (this._type === SpriteType.SIMPLE && this._model) {
                        this._model.trimmed = value;
                    }
                }
            },
            animatable: false,
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.trim'
        },

        /**
         * !#en specify the source Blend Factor, this will generate a custom material object, please pay attention to the memory cost.
         * !#zh 指定原图的混合模式，这会克隆一个新的材质对象，注意这带来的
         * @property srcBlendFactor
         * @type {BlendFactor}
         * @example
         * sprite.srcBlendFactor = cc.BlendFunc.BlendFactor.ONE;
         */
        srcBlendFactor: {
            get: function() {
                return this._srcBlendFactor;
            },
            set: function(value) {
                this._srcBlendFactor = value;
                this._updateBlendFunc();
            },
            animatable: false,
            type:BlendFactor,
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.src_blend_factor'
        },

        /**
         * !#en specify the destination Blend Factor.
         * !#zh 指定目标的混合模式
         * @property dstBlendFactor
         * @type {BlendFactor}
         * @example
         * sprite.dstBlendFactor = cc.BlendFunc.BlendFactor.ONE;
         */
        dstBlendFactor: {
            get: function() {
                return this._dstBlendFactor;
            },
            set: function(value) {
                this._dstBlendFactor = value;
                this._updateBlendFunc();
            },
            animatable: false,
            type: BlendFactor,
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.dst_blend_factor'
        },

        /**
         * !#en specify the size tracing mode.
         * !#zh 精灵尺寸调整模式
         * @property sizeMode
         * @type {Sprite.SizeMode}
         * @example
         * sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
         */
        sizeMode: {
            get: function () {
                return this._sizeMode;
            },
            set: function (value) {
                this._sizeMode = value;
                if (value !== SizeMode.CUSTOM) {
                    this._applySpriteSize();
                }
            },
            animatable: false,
            type: SizeMode,
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.size_mode'
        }
    },

    statics: {
        FillType: FillType,
        Type: SpriteType,
        SizeMode: SizeMode,
        State: State,
    },

    setVisible: function (visible) {
        this.enabled = visible;
    },

    /**
     * Change the state of sprite.
     * @see `Sprite.State`
     * @param state {Sprite.State} NORMAL, GRAY or DISTORTION State.
     */
    setState: function (state) {
        this._state = state;
        // TODO: change the state
    },

    /**
     * Gets the current state.
     * @see `Sprite.State`
     * @return {Sprite.State}
     */
    getState: function () {
        return this._state;
    },

    onEnable: function () {
        this._activateModel();
    },

    onDisable: function () {
        this._removeModel();
    },
    
    _activateModel: function () {
        // model cannot be activated if already exists or component not enabled
        // TODO: Should use enabledInHierarchy
        if (!this.enabled) {
            return;
        }
        // model cannot be activated if texture not loaded yet
        else if (!this._spriteFrame.textureLoaded) {
            return;
        }

        // Get material
        if (!this._material) {
            var texture = this._spriteFrame.getTexture();
            var url = texture.url;
            this._material = renderer.materialUtil.get(url);
            if (!this._material) {
                this._material = new SpriteMaterial();
                this._material.mainTexture = texture.getImpl();
                renderer.materialUtil.register(url, this._material);
            }
        }

        if (!this._model) {
            // Generate model
            switch (this.type) {
            case SpriteType.SIMPLE:
                this._model = SpriteModel.alloc();
                this._model.trimmed = this._isTrimmedMode;
                break;
            case SpriteType.SLICED:
                this._model = SlicedModel.alloc();
                this._model.width = this.node.width;
                this._model.height = this.node.height;
                break;
            case SpriteType.TILED:
                break;
            case SpriteType.FILLED:
                // sgNode.setFillType(this._fillType);
                // sgNode.setFillCenter(this._fillCenter);
                // sgNode.setFillStart(this._fillStart);
                // sgNode.setFillRange(this._fillRange);
                break;
            }
            this._model.setNode(this.node);
        }

        this._model.spriteFrame = this._spriteFrame;

        if (this.srcBlendFactor !== gfx.BLEND_SRC_ALPHA || this.dstBlendFactor !== gfx.BLEND_ONE_MINUS_SRC_ALPHA) {
            this._updateBlendFunc();
        }
        this._model.setEffect(this._material.effect);

        // Add to rendering scene
        renderer.scene.addModel(this._model);
    },

    _removeModel: function () {
        if (!this._model) {
            return;
        }

        // Remove from rendering scene
        renderer.scene.removeModel(this._model);

        // Recycle model
        switch (this.type) {
        case SpriteType.SIMPLE:
            SpriteModel.free(this._model);
            break;
        case SpriteType.SLICED:
            SlicedModel.free(this._model);
            break;
        case SpriteType.TILED:
            break;
        case SpriteType.FILLED:
            break;
        }
        this._model = null;
    },
    
    _updateBlendFunc: function () {
        if (!this._material) {
            return;
        }

        if (!this._customMaterial) {
            this._material = this._material.clone();
            this._customMaterial = true;
        }
        var pass = this._material._mainTech.passes[0];
        pass.setBlend(
            gfx.BLEND_FUNC_ADD,
            this._srcBlendFactor, this._dstBlendFactor,
            gfx.BLEND_FUNC_ADD,
            this._srcBlendFactor, this._dstBlendFactor
        );
    },

    _applyAtlas: CC_EDITOR && function (spriteFrame) {
        // Set atlas
        if (spriteFrame && spriteFrame._atlasUuid) {
            var self = this;
            cc.AssetLibrary.loadAsset(spriteFrame._atlasUuid, function (err, asset) {
                self._atlas = asset;
            });
        } else {
            this._atlas = null;
        }
    },

    _applySpriteSize: function () {
        if (this._spriteFrame) {
            if (SizeMode.RAW === this._sizeMode) {
                var size = this._spriteFrame.getOriginalSize();
                this.node.setContentSize(size);
            } else if (SizeMode.TRIMMED === this._sizeMode) {
                var rect = this._spriteFrame.getRect();
                this.node.setContentSize(rect.width, rect.height);
            }
        }
    },

    _onTextureLoaded: function (event) {
        if (!this.isValid) {
            return;
        }
        // Reattach material to model
        this._activateModel();
        this._applySpriteSize();
    },

    _applySpriteFrame: function (oldFrame) {
        var sgNode = this._sgNode;
        if (oldFrame && oldFrame.off) {
            oldFrame.off('load', this._onTextureLoaded, this);
        }

        var spriteFrame = this._spriteFrame;
        if (spriteFrame) {
            if (spriteFrame.textureLoaded) {
                this._onTextureLoaded(null);
            }
            else {
                spriteFrame.once('load', this._onTextureLoaded, this);
                spriteFrame.ensureLoadTexture();
            }
        }

        if (CC_EDITOR) {
            // Set atlas
            this._applyAtlas(spriteFrame);
        }
    },

    _resized: CC_EDITOR && function () {
        if (this._spriteFrame) {
            var actualSize = this.node.getContentSize();
            var expectedW = actualSize.width;
            var expectedH = actualSize.height;
            if (this._sizeMode === SizeMode.RAW) {
                var size = this._spriteFrame.getOriginalSize();
                expectedW = size.width;
                expectedH = size.height;
            } else if (this._sizeMode === SizeMode.TRIMMED) {
                var rect = this._spriteFrame.getRect();
                expectedW = rect.width;
                expectedH = rect.height;

            }

            if (expectedW !== actualSize.width || expectedH !== actualSize.height) {
                this._sizeMode = SizeMode.CUSTOM;
            }
        }
    },
});

if (CC_EDITOR) {
    // override __preload
    Sprite.prototype.__superPreload = cc.Component.prototype.__preload;
    Sprite.prototype.__preload = function () {
        this.__superPreload();
        this.node.on('size-changed', this._resized, this);
    };
    // override onDestroy
    Sprite.prototype.__superOnDestroy = cc.Component.prototype.onDestroy;
    Sprite.prototype.onDestroy = function () {
        this.__superOnDestroy();
        this.node.off('size-changed', this._resized, this);
    };
}

var misc = require('../utils/misc');
var SameNameGetSets = ['insetLeft', 'insetTop', 'insetRight', 'insetBottom'];
var DiffNameGetSets = {
    type: [null, 'setRenderingType']
};
misc.propertyDefine(Sprite, SameNameGetSets, DiffNameGetSets);

cc.Sprite = module.exports = Sprite;
