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
		function createContext(width, height) {
			let canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			//document.body.appendChild(canvas)

			let gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
			gl.clearColor(0, 0, 0, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
			return gl;
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

		function createTexture(gl,url, level = 0, internalFormat = GLSLFilter.gl.RGBA, format = GLSLFilter.gl.RGBA, type = GLSLFilter.gl.UNSIGNED_BYTE) {
			let texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.bindTexture(gl.TEXTURE_2D, null);

			var image
			switch (url.constuctor.name) {
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
					image = canvas;
					gl.bindTexture(gl.TEXTURE_2D, texture);
					gl.texImage2D(
						gl.TEXTURE_2D,
						0,
						gl.RGBA,
						gl.RGBA,
						gl.UNSIGNED_BYTE,
						url
					);
					gl.bindTexture(gl.TEXTURE_2D, null);
					break;
			}

			return texture
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
			}

			let p = createjs.extend(GLSLFilter, createjs.Filter);

			p.pass = function(shader,uniforms={},textures=[], aCoordName="vPixelCoord") {
				if(!shader) return canvas;

				var vertexShaderText = `#version 300 es
				in vec4 aPos;
				in vec2 aTexCoord;
				out vec2 ${aCoordName};

				void main() {
					${aCoordName} = vec2(aTexCoord.x, 1. - aTexCoord.y);
					gl_Position = aPos;
				}`

				var gl = createContext(canvas.width,canvas.height);
				let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderText);
				let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shader);
				let program = createProgram(gl, vertexShader, fragmentShader);
				if (!program) return canvas;

				let mesh = createScreenQuad(gl);	

				gl.canvas.width = width;
				gl.canvas.height = height;
				gl.viewport(0, 0, width, height);
				gl.clearColor(0, 0, 0, 1);
				gl.clear(gl.COLOR_BUFFER_BIT);


				gl.useProgram(program);

				let aPosLoc = gl.getAttribLocation(shader, "aPos");
				gl.bindBuffer(gl.ARRAY_BUFFER, mesh.VBO);
				gl.enableVertexAttribArray(aPosLoc);
				gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

				let aTexCoordLoc = gl.getAttribLocation(shader, "aTexCoord");
				gl.bindBuffer(gl.ARRAY_BUFFER, mesh.texCoordBuffer);
				gl.enableVertexAttribArray(aTexCoordLoc);
				gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, 0);
			

				//Bind Textures
				for(let texture in textures) {
					glActiveTexture(gl.TEXTURE0+texture)
					glBindTexture(gl.TEXTURE_2D,textures[texture])
				}

				for(let name in uniforms) {
					var data = uniforms[name]
					var type = data[0];
					var value = data[1];

					var func = uniformFunc(type);
					if(!func) continue;
					var location = gl.getUniformLocation(program,name);
					
					gl[func](location,value);
				}

				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.EBO);
				gl.drawElements(gl.TRIANGLES, mesh.data.indices.length, gl.UNSIGNED_SHORT, 0);

				return gl.canvas;
			}
			

			p.getBounds = () => new createjs.Rectangle(0, 0, 0, 0);
			p.addShader = (s) =>{
				this.shaders.push(s);
			}

			p.parseUniforms = (uniforms)=> {
				var textures = [];
				for (const name in uniforms) {
					var data = uniforms[name]
					var type = data[0];
					var value = data[1];

					if(typeof(value)=="function") value = value();
					if(type=="sampler2D") {
							var texture = createTexture(value);
							type = "int"
							value = textures.push(texture);
					}
					if(type.includes("sampler")) { 
						uniforms[name] = undefined;
						continue;
					}

					uniforms[name] = [type,value];
				}
				uniforms = uniforms.filter(u=>u!==undefined);
				return {uniforms,textures}
			}

			p.applyFilter = function (
				context,
				x, y,
				width, height,
				targetContext = context,
				targetX = x, targetY = y
			) {

				var canvas = context.canvas
				for(let shader of this.shaders) {
					shader.uniforms.uStageTex = ["int",canvas];
					var {uniforms,textures} = this.parseUniforms(shader.uniforms);
					canvas = this.pass(canvas,shader.shader,uniforms,textures);
				}

				targetContext.setTransform(1, 0, 0, 1, 0, 0);
				targetContext.clearRect(0, 0, width, height);
				targetContext.drawImage(gl.canvas, targetX, targetY);
			};
			p.clone = function () {
				var filter = new GLSLFilter();
				for (const shader of shaders) {
					filter.addShader(shader);
				}

			};
			p.toString = function () {
				return "[GLSLFilter]";
			};

			return createjs.promote(GLSLFilter, "Filter");
		})();

		unsafeWindow.loadShader = function({ name, shaders = shader, container = world.stage, uniforms = {}, init, tick } = {}) {
			if (typeof name != 'string')
				throw `Invalid name!`;
			if (loadedShaders.contains(name))
				clearShader(name); // clearshader now only uses name
		
			if (typeof shaders == 'string')
				shaders = [{ shaders }];
			else if (typeof shaders != 'object' || shaders === null)
				throw `No shader!`;
		
			for (let s of shaders) {
				s = {
					shader: s.shader,
					container: s.container || container,
					uniforms: s.uniforms || uniforms,
				};
		
				if (!s.container.filter)
					s.container.filter = new GLSLFilter();
				s.container.filter.addShader(s);
			}
		}
		unsafeWindow.clearShaders = function (container = GLSLFilter.DEFAULT_SHADER.container) {
			container.filters = [];
			createjs.Ticker.off(container.cacheTickOff);
		};

		unsafeWindow.GLSLFilter = GLSLFilter;
	}, false);
})();