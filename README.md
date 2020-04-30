# Hello World

*Based off: [https://github.com/baseten/easelbender]*
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