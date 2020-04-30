# Hello World

*Based off: [https://github.com/baseten/easelbender]*

# Steps for now
Copy https://github.com/boxcritters/bc-shaders/blob/master/bc-shaders.js in to console
# Sample Usage
```js
var fs = `#version 300 es
precision mediump float;

in vec2 vPixelCoord;
out vec4 fColor;

uniform sampler2D uStageTex;

void main() {
	fColor = texture(uStageTex,vPixelCoord);
}`
loadShader({fs:fs})
```

# params
{
* fs:FragmentShader
* vs:VertexShader
* data:custom uniforms
}