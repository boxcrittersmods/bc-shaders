# Hello World

*Based off: [https://github.com/baseten/easelbender]*

# Steps for now
1. install https://boxcrittersmods.ga/tools/
1. install https://github.com/boxcritters/bc-shaders/raw/master/bc-shaders.user.js
# Sample Usage
```js
loadShader({fs: `#version 300 es
precision mediump float;

in vec2 vPixelCoord;
out vec4 fColor;

uniform sampler2D uStageTex;
uniform float uTime;
uniform vec2 uViewportSize;
uniform vec2 uMousePos;

void main() {
	fColor = texture(uStageTex,vPixelCoord);
}`})
```

# params
{
* shader:Shader
* data:custom uniforms
* container:
}

# Built in uniforms
* sampler2D uStageTex
* float uTime
* vec2 uViewportSize
* vec2 uMousePos
* float uRandom
