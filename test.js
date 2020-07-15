loadShader({shader:`#version 300 es
	precision mediump float;

	in vec2 vPixelCoord;
	out vec4 fColor;

	uniform sampler2D uStageTex;
	uniform vec2 uViewportSize;

	vec2 pixelize(vec2 uv, vec2 screenSize, float pixelSize) {
		float res = screenSize.x / screenSize.y;
		float nx = screenSize.x / pixelSize;
		float ny = floor(nx / res);
		vec2 pos;
		pos.x = floor(uv.x * nx) / nx;
		pos.y = floor(uv.y * ny) / ny;
		return pos;
	}

	vec4 gameBoy(vec3 color, float gamma) {
		color.r = pow(color.r, gamma);
		color.g = pow(color.g, gamma);
		color.b = pow(color.b, gamma);

		const int COLSLEN = 4;
		vec3[4] cols = vec3[4](
			vec3(.612, .725, .086),
			vec3(.549, .667, .078),
			vec3(.188, .392, .188),
			vec3(.063, .247, .063)
		);

		float dist = distance(color, cols[0]);
		vec3 colorout = cols[0];
		for (int i = 1; i < COLSLEN; i++) {
			float new = distance(color, cols[i]);
			if (new < dist) {
				dist = new;
				colorout = cols[i];
			}
		}

		return vec4(colorout, 1.);
	}

	void main() {
		vec2 pos = pixelize(vPixelCoord, uViewportSize, 2.);
		vec4 color = texture(uStageTex, pos);
		fColor = gameBoy(color.xyz, 1.5);
	}
`})
