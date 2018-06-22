var uiDiv = document.getElementById("uiDiv");
var countdownDiv = document.getElementById("countdown");
var scoreDiv = document.getElementById("scoreDiv");
var canvas = document.getElementById('ctx');
var ctx = canvas.getContext("2d");
var clickCooldown = 0;
ctx.font = "100px Arial";
ctx.textAlign = "center";
ctx.fillStyle = "#FFFFFF";
ctx.fillRect(0, 0, 1200, 600);
ctx.fillStyle = "#BBBBBB";

for (let bgLineX = 0; bgLineX < 1200; bgLineX += 20) {
	ctx.fillRect(bgLineX, 0, 1, 600);
}
for (let bgLineY = 0; bgLineY < 600; bgLineY += 20) {
	ctx.fillRect(0, bgLineY, 1200, 1);
}
ctx.fillStyle = "#000000";

ctx.fillText("No game data =(", 600, 300);
ctx.font = "30px Arial";
ctx.fillText("Try reloading the page.", 600, 330);

ctx.font = "10px Arial";
setTimeout(function() {
	uiDiv.style.height = "0px";
	$("#menuTextDiv").height("20px");
}, 500);

var socket = io();
var id = 0.0;
var mx = 0;
var my = 0;
var lmx = -1;
var lmy = -1;

var upgHP = 500;

var uiVisible = false;
var shooter_blink_state = true;
var dead = false;
var respawnCooldown = 0;
var colorBlink = 0;

socket.on("id", function(data) {
	console.log("Your id is " + data.id);
	id = data.id;
	setTimeout(function() {
		socket.emit("kthx");
	}, 100);
});

function nameInputKeydown(event) {
	if (event.keyCode == 13) {
		$('#setName').click();
	}
}

$("#upgradehp").click(function() {
	if (clickCooldown < 1) {
		clickCooldown = 1;
		setTimeout(function() {
			socket.emit("upgHPClicked");
		}, 100);
	}
});

function changeName() {
	if (clickCooldown < 1) {
		clickCooldown = 1;
		let name = "" + $("#nameInput").val();
		if (name == "") {
			name = "Unnamed";
		}
		console.log("changing name to " + name);
		socket.emit("changeName", {
			name: name
		});
		setCookie("jsshooter_name", name, 60);
		$("#nameInput").val(name);
	}
}

$("#setName").click(function() {
	changeName();
});

$("#upgradedb").click(function() {
	if (clickCooldown < 1) {
		clickCooldown = 1;
		setTimeout(function() {
			socket.emit("upgDualBullets");
		}, 100);
	}
});

$("#upgradeBulletSize").click(function() {
	if (clickCooldown < 1) {
		clickCooldown = 1;
		setTimeout(function() {
			socket.emit("upgBulletSize");
		}, 100);
	}
});

$("#upgradefs").click(function() {
	if (clickCooldown < 1) {
		clickCooldown = 1;
		setTimeout(function() {
			socket.emit("upgFSpeedClicked");
		}, 100);
	}
});

function mouseMove(e) {
	mx = Math.round(e.clientX / window.innerWidth * 1200);
	my = Math.round(e.clientY / window.innerHeight * 600);
	if (e.clientY < window.innerHeight - 70 && uiVisible && !$("#mlock").prop('checked')) {
		unfocus();
		uiVisible = false;
		uiDiv.style.height = "0px";
		$("#menuTextDiv").height("20px");
	} else if (e.clientY > window.innerHeight - 40 && !uiVisible) {
		uiVisible = true;
		$("#menuTextDiv").height("0px");
		uiDiv.style.height = "55px";
	}
}

function unfocus() {
	let tmp = document.createElement("input");
	document.body.appendChild(tmp);
	tmp.focus();
	document.body.removeChild(tmp);
}

socket.on("afk?", function(data) {
	socket.emit("not afk");
});

socket.on("price", function(data) {
	upgHP = data.upgHP;
	$("#upgradehp").html("Upgrade HP (" + upgHP + ")");
	if (data.score >= upgHP && !dead) {
		$("#upgradehp").prop("disabled", false);
	} else {
		$("#upgradehp").prop("disabled", true);
	}

	if (data.doubleFireSpeed == true) {
		if (data.quadrupleFireSpeed == true) {
			$("#upgradefs").html("Quadruple fire speed");
			$("#upgradefs").prop("disabled", true);
		} else {
			$("#upgradefs").html("Quadruple fire speed (8000)");
			if (data.score >= 8000 && !dead) {
				$("#upgradefs").prop("disabled", false);
			} else {
				$("#upgradefs").prop("disabled", true);
			}
		}
	} else {
		$("#upgradefs").html("Double fire speed (2000)");
		if (data.score >= 2000 && !dead) {
			$("#upgradefs").prop("disabled", false);
		} else {
			$("#upgradefs").prop("disabled", true);
		}
	}


	if (data.doubleBulletSize) {
		$("#upgradeBulletSize").prop("disabled", true);
		$("#upgradeBulletSize").html("Upgrade bullet size");
	} else {
		$("#upgradeBulletSize").html("Upgrade bullet size (5000)");
		if (data.score >= 5000 && !dead) {
			$("#upgradeBulletSize").prop("disabled", false);
		} else {
			$("#upgradeBulletSize").prop("disabled", true);
		}
	}

	if (data.dualBullets == true) {
		if (data.quadrupleBullets) {
			$("#upgradedb").prop("disabled", true);
			$("#upgradedb").html("Quadruple bullets");
		} else {
			$("#upgradedb").prop("disabled", true);
			$("#upgradedb").html("Quadruple bullets (8000)");
			if (data.score >= 8000 && !dead) {
				$("#upgradedb").prop("disabled", false);
			} else {
				$("#upgradedb").prop("disabled", true);
			}
		}
	} else {
		$("#upgradedb").html("Dual bullets (5000)");
		if (data.score >= 5000 && !dead) {
			$("#upgradedb").prop("disabled", false);
		} else {
			$("#upgradedb").prop("disabled", true);
		}
	}
});

socket.on("newPositions", function(data) {
	ctx.clearRect(0, 0, 1200, 600);
	ctx.fillStyle = "#FFFFFF";
	ctx.fillRect(0, 0, 1200, 600);
	ctx.textAlign = "center";
	ctx.fillStyle = "#BBBBBB";
	ctx.font = "15px Arial";

	for (let bgLineX = 0; bgLineX < 1200; bgLineX += 20) {
		ctx.fillRect(bgLineX, 0, 1, 600);
	}

	for (let bgLineY = 0; bgLineY < 600; bgLineY += 20) {
		ctx.fillRect(0, bgLineY, 1200, 1);
	}

	for(let i = 0; i < data.players.length; i++) {
		// Get player stats
		if(data.players[i].id == id) {
			let status = "HP: " + data.players[i].hp + "/" + data.players[i].maxHp + " Score: " + data.players[i].score;
			scoreDiv.innerHTML = status;
			$("#powerupCountdownTimer").html(data.players[i].powerupTime);
			if(data.players[i].powerupTime < 0) {
				$("#powerupCountdown").hide();
			}
			if (data.players[i].spawnCooldown > -1) {
				dead = true;
				respawnCooldown = data.players[i].spawnCooldown;
			} else {
				dead = false;
			}
		}

		if(data.players[i].spawnCooldown < 0) {
			let playerAlpha = 1;
			let playerTextColor;

			if(data.players[i].powerupTime > 0) {
				playerAlpha = 1 - colorBlink;
				
				ctx.strokeStyle = "rgba(0, 0, 255, " + playerAlpha + ")";
				ctx.beginPath();
				ctx.arc(data.players[i].x, data.players[i].y, 10 + (Math.sin(new Date().getTime() / 500) * 5), 0, 2 * Math.PI);
				ctx.stroke();
				ctx.strokeStyle = "rgba(0, 255, 0, " + playerAlpha + ")";
				ctx.beginPath();
				ctx.arc(data.players[i].x, data.players[i].y, 10 + (Math.cos(new Date().getTime() / 500) * 5), 0, 2 * Math.PI);
				ctx.stroke();

				if(data.players[i].id == id) {
					$("#powerupCountdown").show();
				}
			}

			if(data.players[i].id == id) {
				playerTextColor = "rgba(0, 160, 0, " + playerAlpha + ")";
			} else {
				playerTextColor = "rgba(255, 0, 0, " + playerAlpha + ")";
			}

			// Player border
			ctx.fillStyle = "rgba(0, 0, 0, " + playerAlpha + ")";
			ctx.fillRect(data.players[i].x - 7, data.players[i].y - 7, 14, 14);
			// Player
			ctx.fillStyle = "hsla(" + data.players[i].color + ", 100%, 50%, " + playerAlpha + ")";
			ctx.fillRect(data.players[i].x - 5, data.players[i].y - 5, 10, 10);

			// Draw player text
			ctx.fillStyle = playerTextColor;
			ctx.fillText(data.players[i].name, data.players[i].x, data.players[i].y - 24);
			ctx.fillText(data.players[i].hp + " HP", data.players[i].x, data.players[i].y - 8);
		}
	}

	for (let i = 0; i < data.powerups.length; i++) {
		ctx.strokeStyle = "#0000FF";
		ctx.beginPath();
		ctx.arc(data.powerups[i].x, data.powerups[i].y, 10 + (Math.sin(new Date().getTime() / 500) * 5), 0, 2 * Math.PI);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(data.powerups[i].x, data.powerups[i].y, 10 + (Math.cos(new Date().getTime() / 500) * 5), 0, 2 * Math.PI);
		ctx.stroke();
		ctx.fillStyle = "#000033";
		ctx.fillRect(data.powerups[i].x - 6, data.powerups[i].y - 6, 12, 12);
		ctx.fillText("Powerup", data.powerups[i].x, data.powerups[i].y - 10);
	}

	for (let i = 0; i < data.bullets.length; i++) {
		ctx.fillStyle = "#000000";
		ctx.beginPath();
		let renderSize = 2;
		if (data.bullets[i].size > 1) renderSize = 3;
		ctx.arc(data.bullets[i].x - (renderSize / 2), data.bullets[i].y - (renderSize / 2), renderSize, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.fill();
	}

	for (let i = 0; i < data.blocks.length; i++) {
		ctx.fillStyle = "#000000";
		ctx.fillRect(data.blocks[i].x - 6, data.blocks[i].y - 6, 12, 12);
		ctx.fillStyle = "#00FF00";
		ctx.fillRect(data.blocks[i].x - 4, data.blocks[i].y - 4, 8, 8);
	}

	for (let i = 0; i < data.attackers.length; i++) {
		ctx.fillStyle = "#0000FF";
		ctx.fillRect(data.attackers[i].x - 5, data.attackers[i].y - 5, 10, 10);
		ctx.fillStyle = ("rgba(" + (255 - (data.attackers[i].activationTimer * 3)) + ", 0, 0, 1)");
		ctx.fillRect(data.attackers[i].x - 3, data.attackers[i].y - 3, 6, 6);
	}

	for (let i = 0; i < data.shooters.length; i++) {
		ctx.fillStyle = "#FF0000";
		ctx.fillRect(data.shooters[i].x - 5, data.shooters[i].y - 5, 10, 10);
		ctx.fillStyle = ("rgba(" + (255 - (data.shooters[i].activationTimer * 3)) + ", " + (255 - (data.shooters[i].activationTimer * 3)) + ", 0, 1)");
		if (data.shooters[i].target == id) {
			if (shooter_blink_state) {
				ctx.fillStyle = "#880000";
			}
		}
		ctx.fillRect(data.shooters[i].x - 3, data.shooters[i].y - 3, 6, 6);
	}

	if (dead) {
		$("#death").show();
		countdownDiv.innerHTML = "Respawn in " + respawnCooldown;
	} else {
		$("#death").hide();
	}
});

// Spam protection
setInterval(function() {
	if (clickCooldown > 0) {
		clickCooldown--;
	} else {
		clickCooldown = -1;
	}
}, 50);

// Sends mouse position to the server 20 times per second
setInterval(function() {
	if(!(lmx == mx && lmy == my)) {
		let pack = {
			x: mx,
			y: my
		};
		socket.emit('mouseMove', pack);
		lmx = mx;
		lmy = my;
	}
}, 50);

setInterval(function() {
	shooter_blink_state = !shooter_blink_state;
}, 500);

setInterval(function() {
	colorBlink = Math.abs(Math.sin(new Date().getTime() / 700) * 1);
}, 50);

var keyRightDown, keyLeftDown, keyUpDown, keyDownDown = false;

document.onkeydown = function(event) {
	if ((event.keyCode === 68 || event.keyCode === 39) && !keyRightDown) { //d
		keyRightDown = true;
		socket.emit('keyPress', {
			inputId: 'right',
			state: true
		});
	} else if ((event.keyCode === 83 || event.keyCode === 40) && !keyDownDown) { //s
		keyDownDown = true;
		socket.emit('keyPress', {
			inputId: 'down',
			state: true
		});
	} else if ((event.keyCode === 65 || event.keyCode === 37) && !keyLeftDown) { //a
		keyLeftDown = true;
		socket.emit('keyPress', {
			inputId: 'left',
			state: true
		});
	} else if ((event.keyCode === 87 || event.keyCode === 38) && !keyUpDown) { // w
		keyUpDown = true;
		socket.emit('keyPress', {
			inputId: 'up',
			state: true
		});
	}
}

document.onkeyup = function(event) {
	if (event.keyCode === 68 || event.keyCode === 39) { //d
		keyRightDown = false;
		socket.emit('keyPress', {
			inputId: 'right',
			state: false
		});
	} else if (event.keyCode === 83 || event.keyCode === 40) { //s
		keyDownDown = false;
		socket.emit('keyPress', {
			inputId: 'down',
			state: false
		});
	} else if (event.keyCode === 65 || event.keyCode === 37) { //a
		keyLeftDown = false;
		socket.emit('keyPress', {
			inputId: 'left',
			state: false
		});
	} else if (event.keyCode === 87 || event.keyCode === 38) { // w
		keyUpDown = false;
		socket.emit('keyPress', {
			inputId: 'up',
			state: false
		});
	}
}

window.onblur = function() {
	keyRightDown = false;
	keyLeftDown = false; 
	keyUpDown = false;
	keyDownDown = false;
	
	socket.emit('keyPress', {
		inputId: 'right',
		state: false
	});
	socket.emit('keyPress', {
		inputId: 'left',
		state: false
	});
	socket.emit('keyPress', {
		inputId: 'up',
		state: false
	});
	socket.emit('keyPress', {
		inputId: 'down',
		state: false
	});
};

try {
	if(getCookie("jsshooter_name") != "") {
		if(getCookie("jsshooter_name").length > 18) {
			console.error("[Warning] Name stored in cookie is too long. resetting to Unnamed");
			setCookie("jsshooter_name", "Unnamed", 360);
		}
		$("#nameInput").val(getCookie("jsshooter_name"));
		$('#setName').click();
	} else {
		setCookie("jsshooter_name", "Unnamed", 360);
	}
} catch(err) {}