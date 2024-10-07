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
	let systemMood = "neutral";
	let moodTransition = 0;
	let fearDuration = 0;
	let traumaState = "none";
	let traumaTimer = 0;
	let boredomTimer = 0;
	const TRAUMA_DURATION = 150;
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
	let backgroundDarkness = 0;
	let happyDuration = 0;
	let sadDuration = 0;
	let angryDuration = 0;
	let lastEmotion = "neutral";
	let particles = []; //new particles

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
				updateSystemMood();
			}
		}, 100);
	}

	function getStrongestEmotion(expressions) {
		return Object.keys(expressions).reduce((a, b) =>
			expressions[a] > expressions[b] ? a : b
		);
	}

	// new function to update system mood with help from Claude.ai
	function updateSystemMood() {
		if (currentEmotion === "happy") happyDuration++;
		else if (currentEmotion === "sad") sadDuration++;
		else if (currentEmotion === "angry") angryDuration++;
		else if (currentEmotion === "neutral") boredomTimer++;
		else if (currentEmotion === "fearful") fearDuration++;

		// Gradually decrease other emotion durations
		if (currentEmotion !== "happy")
			happyDuration = Math.max(0, happyDuration - 0.5);
		if (currentEmotion !== "sad") sadDuration = Math.max(0, sadDuration - 0.5);
		if (currentEmotion !== "angry")
			angryDuration = Math.max(0, angryDuration - 0.5);
		if (currentEmotion !== "neutral")
			boredomTimer = Math.max(0, boredomTimer - 0.5);
		if (currentEmotion !== "fearful")
			fearDuration = Math.max(0, fearDuration - 0.5);

		// Check for mood changes
		let newMood = "neutral";
		let maxDuration = Math.max(
			happyDuration,
			sadDuration,
			angryDuration,
			boredomTimer,
			fearDuration
		);

		if (maxDuration > 0) {
			if (happyDuration === maxDuration && happyDuration > 90) newMood = "glad";
			else if (sadDuration === maxDuration && sadDuration > 150)
				newMood = "depressed";
			else if (angryDuration === maxDuration && angryDuration > 50)
				newMood = "angry";
			else if (boredomTimer === maxDuration && boredomTimer > 300)
				newMood = "bored";
			else if (fearDuration === maxDuration && fearDuration > 15)
				newMood = "fearful";
		}

		// Smooth transition between moods
		if (newMood !== systemMood) {
			moodTransition = 0;
			systemMood = newMood;
		}
		moodTransition = p.min(moodTransition + 0.02, 1);

		// Handle trauma state
		if (fearDuration > 15 && traumaState === "none") {
			triggerTraumaResponse();
		} else if (traumaState !== "none") {
			if (currentEmotion === "happy" && happyDuration > 60) {
				traumaState = "none";
				traumaTimer = 0;
			} else {
				traumaTimer++;
			}
		}

		console.log("Current Emotion:", currentEmotion);
		console.log("System Mood:", systemMood);
		console.log("Happy Duration:", happyDuration);
		console.log("Sad Duration:", sadDuration);
		console.log("Angry Duration:", angryDuration);
		console.log("Boredom Timer:", boredomTimer);
		console.log("Fear Duration:", fearDuration);
		console.log("Trauma State:", traumaState);
		console.log("Trauma Timer:", traumaTimer);

		lastEmotion = currentEmotion;
	}

	function triggerTraumaResponse() {
		let response = p.random(["fight", "flight", "freeze", "dissociate"]);
		traumaState = response;
		traumaTimer = 0;
		console.log("Trauma response triggered:", response);
	}

	p.draw = function () {
		p.frameRate(30);
		p.push();
		p.translate(-p.width / 2, -p.height / 2);

		if (systemMood === "depressed") {
			backgroundDarkness = p.lerp(backgroundDarkness, 0.8, 0.03);
		} else {
			backgroundDarkness = p.lerp(backgroundDarkness, 0, 0.05);
		}
		let bgColor = p.color("#fffceb");
		p.background(bgColor);

		//rectangle over screen
		p.noStroke();
		p.fill(0, 0, 0, backgroundDarkness * 255);
		p.rect(0, 0, p.width, p.height);

		if (traumaState === "dissociate") {
			p.drawingContext.filter = "blur(5px)";
		} else {
			p.drawingContext.filter = "none";
		}
		updateTraumaState();

		// update and display Boids
		for (let boid of boids) {
			boid.update();
			boid.display();
		}
		// draw system mood strokes
		drawSystemMoodStrokes();

		// update and display particles
		updateParticles();

		//display current emotion and system mood
		p.fill(0);
		p.textSize(32);
		p.textAlign(p.CENTER, p.CENTER);
		p.text(currentEmotion.toUpperCase(), p.width / 2, p.height - 80);
		p.text(
			"System Mood: " + systemMood.toUpperCase(),
			p.width / 2,
			p.height / 2 - 0
		);
		p.text(
			"Trauma State: " + traumaState.toUpperCase(),
			p.width / 2,
			p.height - 40
		);

		p.pop();
	};

	function updateTraumaState() {
		switch (traumaState) {
			case "fight":
				for (let boid of boids) {
					boid.fight();
				}
				break;
			case "flight":
				for (let boid of boids) {
					boid.flee();
				}
				break;
			case "freeze":
				//do nothing, boids and particles will not move
				break;
			case "dissociate":
				//particles gradually die
				for (let i = particles.length - 1; i >= 0; i--) {
					particles[i].lifespan -= 5;
					if (particles[i].isDead()) {
						particles.splice(i, 1);
						console.log("trauma state: dissociate");
					}
				}
				break;
		}
		console.log("Current trauma state:", traumaState);
	}

	//New function to draw system mood strokes
	function drawSystemMoodStrokes() {
		let available_brushes = brush.box();

		// Calculate mood intensities
		let gladIntensity = p.map(happyDuration, 0, 90, 0, 1, true);
		let depressedIntensity = p.map(sadDuration, 0, 150, 0, 1, true);
		let angryIntensity = p.map(angryDuration, 0, 50, 0, 1, true);
		let boredIntensity = p.map(boredomTimer, 0, 300, 0, 1, true);

		// Draw strokes for each mood based on their intensity
		if (gladIntensity > 0 && p.random() < 0.1 * gladIntensity) {
			brush.set(p.random(available_brushes), p.random(palette), gladIntensity);
			brush.flowLine(
				p.random(p.width),
				p.random(p.height),
				p.random(100, 300) * gladIntensity,
				p.random(0, 360)
			);
		}

		if (depressedIntensity > 0 && p.random() < 0.05 * depressedIntensity) {
			let depressedColor = p.color(p.random(palette));
			depressedColor.setAlpha(50 * depressedIntensity);
			brush.set(
				p.random(available_brushes),
				depressedColor,
				0.5 * depressedIntensity
			);
			brush.flowLine(
				p.random(p.width),
				p.height - p.random(50),
				p.random(50, 150) * depressedIntensity,
				0
			);
		}

		if (angryIntensity > 0 && p.random() < 0.2 * angryIntensity) {
			brush.set(
				p.random(available_brushes),
				p.color(255, 0, 0),
				2 * angryIntensity
			);
			brush.flowLine(
				p.random(p.width),
				p.random(p.height),
				p.random(200, 400) * angryIntensity,
				p.random(0, 360)
			);
		}

		if (boredIntensity > 0 && p.random() < 0.02 * boredIntensity) {
			brush.set(
				p.random(available_brushes),
				p.color(200),
				0.5 * boredIntensity
			);
			brush.flowLine(
				p.random(p.width),
				p.random(p.height),
				p.random(10, 50) * boredIntensity,
				p.random(0, 360)
			);
		}
	}

	// New particle system
	class Particle {
		constructor(x, y) {
			this.position = p.createVector(x, y);
			this.velocity = p5.Vector.random2D().mult(p.random(1, 3));
			this.acceleration = p.createVector(0, 0);
			this.lifespan = 255;
			this.color = p.color(p.random(palette));
			this.size = p.random(5, 15);
			this.shape = p.random(["circle", "square", "triangle", "star"]);
			this.glowSize = this.size * 2;
		}

		update() {
			if (traumaState !== "freeze" && systemMood !== "bored") {
				this.velocity.add(this.acceleration);
				this.position.add(this.velocity);
				this.acceleration.mult(0);
				this.rotation += 0.05;
			}

			if (systemMood === "depressed") {
				this.lifespan -= 0.5;
			} else if (systemMood !== "bored" && systemMood !== "glad") {
				this.lifespan -= 2;
			}
		}

		display() {
			p.push();
			p.translate(this.position.x, this.position.y);
			p.rotate(this.rotation);
			p.noStroke();
			let displayColor = this.color;

			if (systemMood === "glad") {
				let glowColor = p.color(this.color.toString());
				glowColor.setAlpha(50);
				p.fill(glowColor);
				this.drawShape(this.shape, this.size * 2);
			}

			if (systemMood === "depressed") {
				displayColor.setAlpha(this.lifespan * 0.2);
			} else if (systemMood !== "bored") {
				displayColor.setAlpha(this.lifespan);
			}

			p.fill(displayColor);
			this.drawShape(this.shape, this.size);
			p.pop();
		}

		drawShape(shape, size) {
			switch (shape) {
				case "circle":
					p.ellipse(0, 0, size, size);
					break;
				case "square":
					p.rect(-size / 2, -size / 2, size, size);
					break;
				case "triangle":
					p.triangle(0, -size / 2, -size / 2, size / 2, size / 2, size / 2);
					break;
				case "star":
					this.drawStar(0, 0, size / 2, size / 4, 5);
					break;
			}
		}

		drawStar(x, y, radius1, radius2, npoints) {
			let angle = p.TWO_PI / npoints;
			let halfAngle = angle / 2.0;
			p.beginShape();
			for (let a = 0; a < p.TWO_PI; a += angle) {
				let sx = x + p.cos(a) * radius2;
				let sy = y + p.sin(a) * radius2;
				p.vertex(sx, sy);
				sx = x + p.cos(a + halfAngle) * radius1;
				sy = y + p.sin(a + halfAngle) * radius1;
				p.vertex(sx, sy);
			}
			p.endShape(p.CLOSE);
		}

		isDead() {
			return (
				this.lifespan < 0 && systemMood !== "bored" && systemMood !== "glad"
			);
		}
	}

	function updateParticles() {
		// add new particles based on emotion
		if (p.random() < 0.1 && systemMood !== "bored" && systemMood !== "glad") {
			let x = p.random(p.width);
			let y = p.random(p.height);
			particles.push(new Particle(x, y));
		}

		// Update and display particles
		for (let i = particles.length - 1; i >= 0; i--) {
			let particle = particles[i];
			particle.update();
			particle.display();
			if (particle.isDead()) {
				particles.splice(i, 1);
			}
		}
	}

	//the code for this Boid class was adapted from Garrit Schaap and Daniel Shiffman https://codepen.io/pixelkind/pen/oNJzppX,
	//with use of Claude.ai for assistance in gravity
	class Boid {
		constructor() {
			this.position = p.createVector(p.random(p.width), p.random(p.height));
			this.velocity = p5.Vector.random2D();
			this.acceleration = p.createVector();
			this.maxForce = 0.2;
			this.maxSpeed = 2;
			this.fearSpeed = 4;
		}

		update() {
			if (traumaState === "freeze") return; //Don't move if frozen

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
			this.velocity.limit(
				currentEmotion === "fearful" ? this.fearSpeed : this.maxSpeed
			);
			this.position.add(this.velocity);
			this.acceleration.mult(0);
			this.borders();
		}

		fight() {
			let center = p.createVector(p.width / 2, p.height / 2);
			let toCenter = p5.Vector.sub(center, this.position);
			toCenter.setMag(this.maxSpeed);
			this.acceleration.add(toCenter);

			for (let other of boids) {
				if (other !== this) {
					let d = p5.Vector.dist(this.position, other.position);
					if (d < 50) {
						let collisionForce = p5.Vector.sub(this.position, other.position);
						collisionForce.setMag(this.maxForce * 2);
						this.acceleration.add(collisionForce);
					}
				}
			}
		}

		flee() {
			let edge = this.closestEdge();
			let toEdge = p5.Vector.sub(edge, this.position);
			toEdge.setMag(this.maxSpeed);
			this.acceleration.add(toEdge);
		}

		closestEdge() {
			let edges = [
				p.createVector(0, this.position.y),
				p.createVector(p.width, this.position.y),
				p.createVector(this.position.x, 0),
				p.createVector(this.position.x, p.height),
			];
			return edges.reduce((closest, edge) =>
				p5.Vector.dist(this.position, edge) <
				p5.Vector.dist(this.position, closest)
					? edge
					: closest
			);
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
					if (d < 100) {
						let diff = p5.Vector.sub(this.position, other.position);
						diff.normalize();
						diff.div(d);
						diff.mult(2);
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
			wanderForce.mult(0.5);
			this.acceleration.add(wanderForce);
		}

		borders() {
			if (this.position.x < 0) this.position.x = p.width;
			if (this.position.y < 0) this.position.y = p.height;
			if (this.position.x > p.width) this.position.x = 0;
			if (this.position.y > p.height) this.position.y = 0;
		}

		//the following 5 lines of code were adapted from acamposuribe's p5.brush.js Example 1 - Brush Rain https://editor.p5js.org/acamposuribe/sketches/PmH_Bbk4L
		display() {
			let available_brushes = brush.box();
			brush.set(p.random(available_brushes), emotionColors[currentEmotion], 1);

			let size = 10;
			if (systemMood === "bored") size = 5;
			if (currentEmotion === "sad") size = 2;
			if (systemMood === "angry") size = 20;

			brush.circle(this.position.x, this.position.y, size);

			if (p.random() < 0.001) {
				//random imprinting
				p.push();
				p.noStroke();
				p.fill(p.color(emotionColors[currentEmotion]));
				p.circle(this.position.x, this.position.y, size * 1.5);
				p.pop();
			}
		}
	}

	p.windowResized = function () {
		C.setSize(p.windowWidth, p.windowHeight, 1, "mainCanvas");
		p.resizeCanvas(p.windowWidth, p.windowHeight);
		C.resize();
	};
};

let myp5 = new p5(sketch);
