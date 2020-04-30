
clearShaders(world.stage)
loadShader({
	vs: `#version 300 es
in vec4 aPos;
in vec2 aTexCoord;

out vec2 vPixelCoord;

void main(){
	vPixelCoord = vec2(aTexCoord.x,1.0-aTexCoord.y);
	gl_Position = aPos;
}`,
	fs:`#version 300 es
	precision mediump float;
	
	in vec2 vPixelCoord;
	out vec4 fColor;
	
	uniform sampler2D uStageTex;
	uniform float uTime;
	uniform vec2 uViewportSize;
	uniform vec2 uMousePos;
	
	void main() {
		float range = 100.0;
		fColor = texture(uStageTex,vPixelCoord)*vec4(uMousePos/uViewportSize,1,1);
	}`,
	data:{
	},
	container:world.stage
});
