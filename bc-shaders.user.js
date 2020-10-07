// ==UserScript==
// @name         BoxCritters Shaders
// @namespace    https://boxcrittersmods.ga/
// @version      0.0.6.64
// @description  Create shaders for boxcritters
// @author       TumbleGamer, SArpnt
// @match        https://boxcritters.com/play/
// @match        https://boxcritters.com/play/?*
// @match        https://boxcritters.com/play/#*
// @match        https://boxcritters.com/play/index.html
// @match        https://boxcritters.com/play/index.html?*
// @match        https://boxcritters.com/play/index.html#*
// ==/UserScript==

(function () {
	'use strict';
	console.info(
		`-----------------------------------
[BOX CRITTERS SHADER LOADER]
A mod created by TumbleGamer, with help from SArpnt
-----------------------------------`
	);
	unsafeWindow.addEventListener('load', function () {
		function isPowerOf2(value) {
			return (value & (value - 1)) == 0;
		}

		function createShader(gl, type, source) {
			let shader = gl.createShader(type);
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
			if (success) return shader;

			console.log(gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
		}

		function createProgram(gl, vertexShader, fragmentShader) {
			let program = gl.createProgram();
			gl.attachShader(program, vertexShader);
			gl.attachShader(program, fragmentShader);
			gl.linkProgram(program);
			let success = gl.getProgramParameter(program, gl.LINK_STATUS);
			if (success) return program;
			console.log(gl.getProgramInfoLog(program));
			gl.deleteProgram(program);
		}

		function createMesh(gl, data) {
			//let VAO = gl.createVertexArray()
			let VBO = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.vertices), gl.STATIC_DRAW);

			let texCoordBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.texCoords), gl.STATIC_DRAW);

			let EBO = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, EBO);
			gl.bufferData(
				gl.ELEMENT_ARRAY_BUFFER,
				new Uint16Array(data.indices),
				gl.STATIC_DRAW
			);
			return { data, VBO, texCoordBuffer, EBO };
		}

		function createTexture(gl, url, level = 0, internalFormat = gl.RGBA, format = gl.RGBA, type = gl.UNSIGNED_BYTE) {
			let texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.bindTexture(gl.TEXTURE_2D, null);

			let image;
			switch (url.constructor.name) {
				case "String":
					image = new Image();
					image.crossOrigin = "Anonymous";
					image.onload = function () {
						gl.bindTexture(gl.TEXTURE_2D, texture);
						gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, format, type, image);
						if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
							gl.generateMipmap(gl.TEXTURE_2D);
						} else {
							gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
							gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
							gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
						}
						gl.bindTexture(gl.TEXTURE_2D, null);
					};
					image.src = url;
					break;
				case "HTMLCanvasElement":
					gl.bindTexture(gl.TEXTURE_2D, texture);
					gl.texImage2D(
						gl.TEXTURE_2D,
						0,
						gl.RGBA,
						gl.RGBA,
						gl.UNSIGNED_BYTE,
						url // url is acutally canvas
					);
					gl.bindTexture(gl.TEXTURE_2D, null);
					break;
			}

			return texture;
		};

		function createScreenQuad(gl) {
			let vertices = [-1, 1, -1, -1, 1, -1, 1, 1];
			let texCoords = [0, 1, 0, 0, 1, 0, 1, 1];
			let indices = [0, 1, 2, 0, 2, 3];
			return createMesh(gl, { vertices, texCoords, indices });
		}

		function uniformFunc(type) {
			if ("234".includes(type.slice(-1))) {
				let n = type.slice(-1);
				switch (type.slice(0, -1)) {
					case 'vec':
						return `uniform${n}fv`;
					case 'mat':
						return `uniformMatrix${n}fv`;
				}
			} else
				switch (type) {
					case 'float':
						return `uniform1f`;
					case 'int':
					case 'signed int':
						return `uniform1i`;
				}
		}

		let GLSLFilter = (() => {

			function GLSLFilter() {
				console.log("GLSLFilter created");

				this.shaders = [];
				this.usesContext = true;

				let canvas = document.createElement("canvas");
				this.gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
				this.gl.clearColor(0, 0, 0, 1);
				this.gl.clear(this.gl.COLOR_BUFFER_BIT);
			}

			let p = createjs.extend(GLSLFilter, createjs.Filter);

			p.setupContext = function (width, height) {
				this.gl.canvas.width = width;
				this.gl.canvas.height = height;
				this.gl.clearColor(0, 0, 0, 1);
				this.gl.clear(this.gl.COLOR_BUFFER_BIT);
				return this.gl;
			};

			p.pass = function (canvas, shader, uniforms = {}, aCoordName = "vStageCoord") {
				if (!shader) return canvas;

				let vertexShaderText = `#version 300 es
				in vec4 aPos;
				in vec2 aTexCoord;
				out vec2 ${aCoordName};

				void main() {
					${aCoordName} = vec2(aTexCoord.x, 1. - aTexCoord.y);
					gl_Position = aPos;
				}`;

				let gl = this.setupContext(canvas.width, canvas.height);
				let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderText);
				let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shader);
				let program = createProgram(gl, vertexShader, fragmentShader);
				if (!program) return canvas;

				let mesh = createScreenQuad(gl);

				gl.canvas.width = canvas.width;
				gl.canvas.height = canvas.height;
				gl.viewport(0, 0, canvas.width, canvas.height);
				gl.clearColor(0, 0, 0, 1);
				gl.clear(gl.COLOR_BUFFER_BIT);


				gl.useProgram(program);

				let aPosLoc = gl.getAttribLocation(program, "aPos");
				gl.bindBuffer(gl.ARRAY_BUFFER, mesh.VBO);
				gl.enableVertexAttribArray(aPosLoc);
				gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

				let aTexCoordLoc = gl.getAttribLocation(program, "aTexCoord");
				gl.bindBuffer(gl.ARRAY_BUFFER, mesh.texCoordBuffer);
				gl.enableVertexAttribArray(aTexCoordLoc);
				gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, 0);

				let textures = [];
				for (let name in uniforms) {
					let [type, value] = uniforms[name];

					if (typeof (value) == "function") value = value();
					if (type == "sampler2D") {
						let texture = createTexture(gl, value);
						type = "int";
						value = textures.push(texture) - 1;
					} else if (type.includes("sampler")) {
						delete uniforms[name];
						continue;
					}

					let func = uniformFunc(type);
					if (!func) continue;
					let location = gl.getUniformLocation(program, name);

					gl[func](location, value);
				}
				// bind textures
				for (let id in textures) {
					gl.activeTexture(gl.TEXTURE0 + id);
					gl.bindTexture(gl.TEXTURE_2D, textures[id]);
				}

				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.EBO);
				gl.drawElements(gl.TRIANGLES, mesh.data.indices.length, gl.UNSIGNED_SHORT, 0);

				return gl.canvas;
			};


			p.getBounds = () => new createjs.Rectangle(0, 0, 0, 0);
			p.addShader = function (shader) {
				return this.shaders.push(shader);
			};
			p.applyFilter = function (
				context,
				x, y,
				width, height,
				targetContext = context,
				targetX = x, targetY = y
			) {
				if (this.shaders.length) {
					let canvas = context.canvas;

					for (let shader of this.shaders) {
						shader.uniforms.uStageTex = ["sampler2D", canvas];
						canvas = this.pass(canvas, shader.shader, shader.uniforms);
					}

					targetContext.clearRect(0, 0, width, height);
					targetContext.drawImage(canvas, targetX, targetY);
				}
			};
			p.clone = function () {
				console.log('Cloning GLSLFilter...');
				let filter = new GLSLFilter();
				for (const shader of shaders)
					filter.addShader(shader);
			};
			p.toString = function () {
				return "[GLSLFilter]";
			};

			return createjs.promote(GLSLFilter, "Filter");
		})();

		let loadedShaderpacks = [];
		unsafeWindow.loadShaderpack = function ({
			name,
			shader,
			shaders = shader,
			container = world.stage,
			uniforms = {},
			init,
			tick,
		} = {}) {
			if (typeof name != 'string')
				throw `Invalid name!`;
			if (loadedShaderpacks.includes(name))
				clearShaderpack(name);

			if (typeof shaders == 'string')
				shaders = [{ shader: shaders }];
			else if (typeof shaders != 'object' || shaders === null)
				throw `No shader!`;

			for (let s of shaders) {
				s = {
					shader: s.shader,
					container: s.container || container,
					uniforms: s.uniforms || uniforms,
				};

				if (!s.container.GLSLFilter) {
					s.container.GLSLFilter = new GLSLFilter();
					s.container.filters || (s.container.filters = []);
					s.container.filters.push(s.container.GLSLFilter);
				}
				if (!s.container.bitmapCache) {
					s.container.cache(0, 0, container.width, container.height);
					s.container.cacheTickOff = createjs.Ticker.on("tick", function (t) {
						s.container.updateCache();
					});
				}
				s.container.GLSLFilter.addShader(s);
			}

			loadedShaderpacks.push(name);
		};
		unsafeWindow.clearShaderpack = function (name) {
			if (!loadedShaderpacks.contains(name))
				return;
			console.error('This function needs to remove the old shader!');
			loadedShaderpacks = loadedShaderpacks.filter(e => e !== name);
			//container.filters = [];
			//createjs.Ticker.off(container.cacheTickOff);
		};

		unsafeWindow.GLSLFilter = GLSLFilter;
	}, false);
})();