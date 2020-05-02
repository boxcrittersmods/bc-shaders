
loadShader({shader:`#version 300 es
    precision mediump float;
    
    in vec2 vPixelCoord;
    out vec4 fColor;
    
	uniform sampler2D uStageTex;
	uniform vec2 uViewportSize;


	void main() {
	  fColor = vec4(1,0,1,1);
	}	

`})