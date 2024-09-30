//this version of the code was updated by Linnea Nilsson and Isabel Sivira

//this code was adapted using Claude.ai,
//Web Dev Simplified on YouTube https://www.youtube.com/watch?v=CVClHLwv-4I,
//tutorials from Garrit Schaap as provided in our Creative Coding course modules,
//p5.brush tutorials from acamposuribe,
//and tutorials from Daniel Shiffman

//the following 51 lines of code were adapted using Claude.ai
let sketch = function (p) {
	let video;
	let canvas;
	let boids = [];
	let currentEmotion = "neutral";
	let emotionColors = {
		happy: "#FFA500",
		sad: "#4169E1",
		angry: "#FF0000",
		surprised: "#FFD700",
		fearful: "#800080",
		disgusted: "#008000",
		neutral: "#808080",
	};
	let myFont;
	let palette = [
		"#2c695a",
		"#4ad6af",
		"#7facc6",
		"#4e93cc",
		"#f6684f",
		"#ffd300",
	];

	const C = {
		loaded: false,
		prop() {
			return this.height / this.width;
		},
		isLandscape() {
			return window.innerHeight <= window.innerWidth * this.prop();
		},
		resize() {
			if (this.isLandscape()) {
				document.getElementById(this.css).style.height = "100%";
				document.getElementById(this.css).style.removeProperty("width");
			} else {
				document.getElementById(this.css).style.removeProperty("height");
				document.getElementById(this.css).style.width = "100%";
			}
		},
		setSize(w, h, p, css) {
			(this.width = w), (this.height = h), (this.pD = p), (this.css = css);
		},
		createCanvas() {
			this.main = p.createCanvas(this.width, this.height, p.WEBGL);
			p.pixelDensity(this.pD);
			this.main.id(this.css);
			this.resize();
		},
	};

	//preload font in WEBGL version
	p.preload = function () {
		myFont = p.loadFont(
			"https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceSansPro-Regular.otf"
		);
	};

	brush.instance(p);

	p.setup = function () {
		C.setSize(p.windowWidth, p.windowHeight, 1, "mainCanvas");
		C.createCanvas();
		p.textFont(myFont);
		brush.load();
		brush.scaleBrushes(1.5);
		brush.field("seabed"); //credits to the p5.brush library and acamposuribe https://editor.p5js.org/acamposuribe/sketches/PmH_Bbk4L

		video = p.createCapture(p.VIDEO);
		video.size(320, 240);
		video.hide();

		for (let i = 0; i < 50; i++) {
			boids.push(new Boid());
		}

		loadFaceAPI();
		console.log("Setup complete");
	};

	//the following 2 functions were adapted using a tutorial by Web Dev Simplified on YouTube https://www.youtube.com/watch?v=CVClHLwv-4I
	function loadFaceAPI() {
		Promise.all([
			faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
			faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
			faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
			faceapi.nets.faceExpressionNet.loadFromUri("/models"),
		]).then(startFaceDetection);
	}

	function startFaceDetection() {
		console.log("Face detection started");
		setInterval(async () => {
			const detections = await faceapi
				.detectAllFaces(video.elt, new faceapi.TinyFaceDetectorOptions())
				.withFaceLandmarks()
				.withFaceExpressions();

			if (detections.length > 0) {
				let emotion = getStrongestEmotion(detections[0].expressions);
				if (emotion !== currentEmotion) {
					console.log("Emotion changed to:", emotion);
					currentEmotion = emotion;
				}
			}
		}, 100);
	}

	function getStrongestEmotion(expressions) {
		return Object.keys(expressions).reduce((a, b) =>
			expressions[a] > expressions[b] ? a : b
		);
	}

	p.draw = function () {
		p.frameRate(30);
		p.background("#fffceb");
		p.push();
		p.translate(-p.width / 2, -p.height / 2);

		// update and display Boids
		for (let boid of boids) {
			boid.update();
			boid.display();
		}

		// draw with p5brush
		let available_brushes = brush.box();
		brush.set(p.random(available_brushes), p.random(palette), 1);
		brush.flowLine(
			p.random(p.width),
			p.random(p.height),
			p.random(300, 800),
			p.random(0, 360)
		);

		// display current emotion
		p.fill(0);
		p.textSize(32);
		p.textAlign(p.CENTER, p.CENTER);
		p.text(currentEmotion.toUpperCase(), p.width / 2, p.height - 50);

		p.pop();
	};

	//the code for this Boid class was adapted from Garrit Schaap and Daniel Shiffman https://codepen.io/pixelkind/pen/oNJzppX,
	//with use of Claude.ai for assistance in gravity
	class Boid {
		constructor() {
			this.position = p.createVector(p.random(p.width), p.random(p.height));
			this.velocity = p5.Vector.random2D();
			this.acceleration = p.createVector();
			this.maxForce = 0.2;
			this.maxSpeed = 2;
		}

		update() {
			switch (currentEmotion) {
				case "happy":
					this.cluster();
					break;
				case "sad":
					this.dropToGround();
					break;
				case "angry":
					this.shake();
					break;
				case "fearful":
					this.runAway();
					break;
				case "disgusted":
					this.stop();
					break;
				case "surprised":
					this.circle();
					break;
				default:
					this.wander();
			}

			this.velocity.add(this.acceleration);
			this.velocity.limit(this.maxSpeed);
			this.position.add(this.velocity);
			this.acceleration.mult(0);
			this.borders();
		}

		cluster() {
			let center = p.createVector(p.width / 2, p.height / 2);
			let desired = p5.Vector.sub(center, this.position);
			desired.setMag(this.maxSpeed);
			let steer = p5.Vector.sub(desired, this.velocity);
			steer.limit(this.maxForce);
			this.acceleration.add(steer);
		}

		dropToGround() {
			let gravity = p.createVector(0, 0.1);
			this.acceleration.add(gravity);
		}

		shake() {
			let shake = p5.Vector.random2D();
			shake.mult(0.5);
			this.acceleration.add(shake);
		}

		runAway() {
			for (let other of boids) {
				if (other !== this) {
					let d = p5.Vector.dist(this.position, other.position);
					if (d < 50) {
						let diff = p5.Vector.sub(this.position, other.position);
						diff.normalize();
						diff.div(d);
						this.acceleration.add(diff);
					}
				}
			}
		}

		stop() {
			this.velocity.mult(0);
		}

		circle() {
			let center = p.createVector(p.width / 2, p.height / 2);
			let desired = p5.Vector.sub(center, this.position);
			desired.setMag(this.maxSpeed);
			let steer = p5.Vector.sub(desired, this.velocity);
			steer.limit(this.maxForce);
			this.acceleration.add(steer);
			this.acceleration.add(
				p.createVector(this.velocity.y, -this.velocity.x).setMag(0.1)
			);
		}

		wander() {
			let wanderForce = p5.Vector.random2D();
			wanderForce.mult(0.1);
			this.acceleration.add(wanderForce);
		}
		//the following 5 lines of code were adapted from acamposuribe's p5.brush.js Example 1 - Brush Rain https://editor.p5js.org/acamposuribe/sketches/PmH_Bbk4L
		display() {
			let available_brushes = brush.box();
			brush.set(p.random(available_brushes), emotionColors[currentEmotion], 1);
			brush.circle(this.position.x, this.position.y, 10);
		}

		borders() {
			if (this.position.x < 0) this.position.x = p.width;
			if (this.position.y < 0) this.position.y = p.height;
			if (this.position.x > p.width) this.position.x = 0;
			if (this.position.y > p.height) this.position.y = 0;
		}
	}

	p.windowResized = function () {
		C.setSize(p.windowWidth, p.windowHeight, 1, "mainCanvas");
		p.resizeCanvas(p.windowWidth, p.windowHeight);
		C.resize();
	};
};

let myp5 = new p5(sketch);
