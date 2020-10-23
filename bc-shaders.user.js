// ==UserScript==
// @name         BoxCritters Shaders
// @namespace    https://boxcrittersmods.ga/
// @version      0.1.5.74
// @description  Create shaders for boxcritters
// @author       TumbleGamer, SArpnt
// @require      https://github.com/tumble1999/mod-utils/raw/master/mod-utils.js
// @require      https://github.com/tumble1999/modial/raw/master/modial.js
// @require      https://github.com/SArpnt/ctrl-panel/raw/master/script.user.js
// @require      https://github.com/tumble1999/critterguration/raw/master/critterguration.user.js
// @match        https://boxcritters.com/play/
// @match        https://boxcritters.com/play/?*
// @match        https://boxcritters.com/play/#*
// @match        https://boxcritters.com/play/index.html
// @match        https://boxcritters.com/play/index.html?*
// @match        https://boxcritters.com/play/index.html#*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
	'use strict';
	const mod = new TumbleMod({
		id: "bcShaders",
		abriv: "BCS",
	});

	function isPowerOf2(value) {
		return (value & (value - 1)) == 0;
	}

	function createShader(gl, type, source) {
		let shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		if (success) return shader;

		mod.log(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
	}

	function createProgram(gl, vertexShader, fragmentShader) {
		let program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		let success = gl.getProgramParameter(program, gl.LINK_STATUS);
		if (success) return program;
		mod.log(gl.getProgramInfoLog(program));
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

	function createTexture(gl, src, level, internalFormat, format, type) {
		let texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);

		modifyTexture(texture, gl, src, level, internalFormat, format, type);

		return texture;
	};

	function modifyTexture(texture, gl, src, level = 0, internalFormat = gl.RGBA, format = gl.RGBA, type = gl.UNSIGNED_BYTE) {
		switch (src.constructor.name) {
			case "String":
				{
					let image = new Image();
					image.crossOrigin = "Anonymous";
					image.src = src;
					src = image; // should be safe
				}
			case "HTMLImageElement":
				function onLoad() {
					gl.bindTexture(gl.TEXTURE_2D, texture);
					gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, format, type, src);
					if (isPowerOf2(src.width) && isPowerOf2(src.height)) {
						gl.generateMipmap(gl.TEXTURE_2D);
					} else {
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
					}
					gl.bindTexture(gl.TEXTURE_2D, null);
				};
				if (src.complete) onLoad();
				else src.addEventListener('load', onLoad);
				break;
			case "HTMLCanvasElement":
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					src
				);
				gl.bindTexture(gl.TEXTURE_2D, null);
				break;
		}
	}

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
	TumbleMod.onDocumentLoaded().then(_ => {
		let GLSLFilter = (_ => {
			function GLSLFilter(container) {
				mod.log("GLSLFilter created");

				this.container = container;
				container.GLSLFilter = this;

				container.filters || (container.filters = []);
				container.filters.push(this);

				if (!container.bitmapCache) {
					container.cache(0, 0, container.width, container.height);
					container.cacheTickOff = createjs.Ticker.on("tick", function (t) {
						container.updateCache();
					});
				}

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

			p.pass = function (canvas, program, uniforms = {}) {
				if (!program) return canvas;

				let gl = this.setupContext(canvas.width, canvas.height);

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

				for (let name in uniforms) {
					//console.time(name);
					let [type, args, value, data] = uniforms[name];

					if (typeof value == "function")
						value = value(canvas);

					if (data[0] == "sampler2D") {
						mod.log(`uTexture:`, name, value, data[1]);
						let texture = modifyTexture(value, this.gl, data[1]);
						gl.activeTexture(gl.TEXTURE0 + value);
						gl.bindTexture(gl.TEXTURE_2D, texture);
					} else
						gl[type](...args, value); // this doesn't acutally need to constantly be repeated unless value is a function, this should be moved

					//console.timeEnd(name);
				}
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.EBO);
				gl.drawElements(gl.TRIANGLES, mesh.data.indices.length, gl.UNSIGNED_SHORT, 0);

				return gl.canvas;
			};


			p.getBounds = () => new createjs.Rectangle(0, 0, 0, 0);
			p.addShader = function (shader) {
				let hr = typeof this.container.bitmapCache.hScale != 'undefined',
					st = hr ? 'hScale' : 'scale';
				if (this.container.bitmapCache[st] < shader.resolution) {
					this.container.bitmapCache[st] = shader.resolution;
					if (hr)
						window.world.stage.hUpdate();
				}

				// calculate shader.crop
				for (let i in shader.crop) {
					let param = ['x', 'y', 'width', 'height'][i],
						comp = ['width', 'height', 'width', 'height'][i],
						act = ['max', 'max', 'min', 'min'][i];

					this.container.bitmapCache[param] = Math[act](
						this.container.bitmapCache[param],
						Math.round(shader.crop[i] * this.container[comp])
					);
				}

				// add uniforms
				shader.uniforms = Object.assign({
					uStageTex: ["sampler2D", c => c],
					uTime: ["float", _ => performance.now()],
					uViewportSize: ["vec2", c => [c.width, c.height]],
					uViewportScale: ["float", this.container.bitmapCache.scale],
				}, shader.uniforms);

				// create program
				shader.vertex = shader.vertex || `#version 300 es
				in vec4 aPos;
				in vec2 aTexCoord;
				out vec2 vStageCoord;

				void main() {
					vStageCoord = vec2(aTexCoord.x, 1. - aTexCoord.y);
					gl_Position = aPos;
				}`;

				let vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, shader.vertex);
				let fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, shader.shader);
				shader.program = createProgram(this.gl, vertexShader, fragmentShader);

				// parse uniforms
				let texCount = 0;
				for (let name in shader.uniforms) {
					let [type, value] = shader.uniforms[name];

					let data = [];
					if (type == "sampler2D") {
						mod.log(`init uTexture:`, { type, name, value });
						let texture = createTexture(this.gl, value);
						data.push("sampler2D", value);
						type = "int";
						value = texCount++; // texcount increases AFTER value is set, so value is set to texture id
						this.gl.activeTexture(this.gl.TEXTURE0 + value);
						this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
					} else if (type.includes("sampler")) {
						delete shader.uniforms[name];
						continue;
					}

					let func = uniformFunc(type);
					if (!func) {
						delete shader.uniforms[name];
						continue;
					};
					let location = this.gl.getUniformLocation(shader.program, name);

					mod.log(`init uniform:`, { name, func, type, value, data });

					let args;
					if (func.includes("Matrix"))
						args = [location, false];
					else
						args = [location];

					shader.uniforms[name] = [func, args, value, data];
				}

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

					if (context !== targetContext) {
						targetContext.clearRect(0, 0, width, height);
						targetContext.drawImage(canvas, targetX, targetY);
					}
					for (let shader of this.shaders) {
						canvas = this.pass(targetContext.canvas, shader.program, shader.uniforms);
						targetContext.clearRect(0, 0, width, height);
						targetContext.drawImage(canvas, targetX, targetY);
					}
				}
			};
			p.clone = function () {
				mod.log('Cloning GLSLFilter...');
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
		function loadShaderpack({
			name,
			vertex,
			shader,
			shaders = shader,
			container = world.stage,
			uniforms = {},
			resolution = 1,
			crop = [0, 0, 1, 1],
			debug = false,
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
					vertex: s.vertex || vertex,
					shader: s.shader,
					container: s.container || container,
					uniforms: s.uniforms || uniforms,
					resolution: s.resolution || resolution,
					crop: s.crop || crop,
					debug: s.debug || debug
				};

				if (!s.container.GLSLFilter)
					new GLSLFilter(s.container);
				s.container.GLSLFilter.addShader(s);
			}

			loadedShaderpacks.push(name);
		};
		function clearShaderpack(name) {
			if (!loadedShaderpacks.includes(name))
				return;
			console.error('This function needs to remove the old shader!');
			loadedShaderpacks = loadedShaderpacks.filter(e => e !== name);
			//remove shader from shaderlist
			//remove cropping if neccecary
			//remove resolution if neccecary

			//container.filters = [];
			//createjs.Ticker.off(container.cacheTickOff);
		};


		let bcShadersSettings = Critterguration.registerSettingsMenu(mod, () => {
			bcShadersSettings.innerHTML = "";
			let packList = bcShadersSettings.createListGroup("Loaded Shaders");
			loadedShaderpacks.forEach(pack => {
				packList.addItem(pack.name, "primary",
					`Uniforms: ${pack.uniforms.length}
				Shaders: ${pack.shaders.length}
				Resostion: ${pack.resolution}`);
			});
		});

		window.GLSLFilter = GLSLFilter;
		window.loadShaderpack = loadShaderpack;
		window.clearShaderpack = clearShaderpack;
	}, false);
})();