# Box Critters Shaders

*Based off: [https://github.com/baseten/easelbender]*

## Steps (for now)

1. Install https://boxcrittersmods.ga/other/tampermonkey/
2. Install https://github.com/boxcritters/bc-shaders/raw/master/bc-shaders.user.js

## Sample Usage

```js
{/* output? */ } = loadShaderpack({
	name,
	shaders: [ // still supports glsl code directly
		{
			shader: `#version 300 es
			precision mediump float;
	
			in vec2 vStageCoord;
			out vec4 fColor;
	
			uniform sampler2D uStageTex;
			uniform vec2 uViewportSize;
			uniform float uTime;
			uniform sampler2D uSampler2D;
	
			void main() {
				fColor = texture(uSampler2D, vStageCoord) + texture(uStageTex, vStageCoord);
			}
	`,
			container, // defaults to outer
			uniforms, // defaults to outer
			resolution, // defaults to outer
			crop, // defaults to outer
		},
	],
	container,
	uniforms: {
		uUnsignedInt: ['unsigned int', 35], // webgl 2 only! uniform1ui
		uIntArray: ['int', [23, -53, 12]], // uniform1i
		uVec2Array: ['vec2', [[1.2, 0], [-.3, 1800]]], // uniform2fv
		uSampler2D: ['sampler2D', 'https://bean.com/bean.png'],
		uDynamicVec4: ['vec4', (/* inputs? */) => [.2, .3, .2, .8];]
	},
	resolution: 1, // scale for bitmapCache, higher numbers give more detail
	crop: [0, 0, 1, 1], // bitmapCache cropping (useful for zooming shaders, improves performance) x,y,width,height multipliers
	init: function (gl /* inputs? */) { // runs only first time
		return /* outputs? */;
	},
	tick: function (gl /* inputs? */) {
		return /* outputs? */;
	},
});
```

## Built in uniforms

* sampler2D uStageTex
* float uTime
* vec2 uViewportSize