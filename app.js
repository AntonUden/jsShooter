var express = require('express');
var app = express();
var serv = require('http').Server(app);
var colors = require('colors/safe');

console.log(colors.green("[jsShooter] Starting server..."));
app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

var fps = 30;
var port = process.env.PORT || 80;
serv.listen(port);
var io = require("socket.io")(serv, {});

console.log(colors.green("[jsShooter] Socket started on port " + port));

var SOCKET_LIST = {};
var PLAYER_LIST = {};
var BULLET_LIST = {};
var BLOCK_LIST = {};
var ATTACKER_LIST = {};
var NPCSHOOTER_LIST = {};
var POWERUP_LIST = {};

// Npc shooter object
var NPCShooter = function(id, x, y) {
	var self = {
		id:id,
		x:x,
		y:y,
		targetPlayer:-1,
		hp:3,
		activationTimer:100
	}

	if(countOPPlayers() > 0) {
		self.hp = 10;
	}

	self.fireBullet = function() {
		try {
			var bID = Math.random() * 200;
			var target = PLAYER_LIST[self.targetPlayer];
			BULLET_LIST[bID] = Bullet(bID, -1, self.x, self.y, Math.atan2(target.y - self.y, target.x - self.x) * 180 / Math.PI, 1);
		} catch(error) {

		}
	}

	self.update = function() {
		if(self.activationTimer > 0) {
			self.activationTimer--;
		} else {
			try {
				var dist = {};
				for(var p in PLAYER_LIST) {
					var player = PLAYER_LIST[p];
					if(countOPPlayers() < 1) {
						if(player.joinKickTimeout < 0 && player.spawnCooldown < 0) {
							var d = getDistance(self.x, self.y, player.x, player.y);
							dist[player.id] = d;
						}
					} else {
						if(isOP(player)) {
							var d = getDistance(self.x, self.y, player.x, player.y);
							dist[player.id] = d;
						}
					}
				}
				var target = getSmallest(dist);
				if(!(target == undefined)) {
					self.targetPlayer = target;
					if(getDistance(self.x, self.y, PLAYER_LIST[self.targetPlayer].x, PLAYER_LIST[self.targetPlayer].y) > 50 && countOPPlayers() < 1) {
 						var dir = Math.atan2(PLAYER_LIST[self.targetPlayer].y - self.y, PLAYER_LIST[self.targetPlayer].x - self.x) * 180 / Math.PI;
 						self.x += Math.cos(dir/180*Math.PI) * 0.5;
 						self.y += Math.sin(dir/180*Math.PI) * 0.5;
 					}
				} else {
					self.targetPlayer = -1;
				}

				if(!(self.targetPlayer == -1)) {
					
				} else {
				}

			} catch(err) {

			}
		}
		if(self.hp <= 0) {
			delete NPCSHOOTER_LIST[self.id];
		}
	}

	return self;
}

// NPC attacker object
var NPCAttacker = function(id, x, y) {
	var self = {
		id:id,
		x:x,
		y:y,
		targetPlayer:-1,
		hp:5,
		activationTimer:100
	}

	self.update = function() {
		if(self.activationTimer > 0) {
			self.activationTimer--;
		} else {
			try {
				var dist = {};
				for(var p in PLAYER_LIST) {
					var player = PLAYER_LIST[p];
					if(player.joinKickTimeout < 0 && player.spawnCooldown < 0) {
						var d = getDistance(self.x, self.y, player.x, player.y);
						dist[player.id] = d;
					}
				}
				var target = getSmallest(dist);
				if(!(target == undefined)) {
					self.targetPlayer = target;
				} else {
					self.targetPlayer = -1;
				}

				if(!(self.targetPlayer == -1)) {
 					if(getDistance(self.x, self.y, PLAYER_LIST[self.targetPlayer].x, PLAYER_LIST[self.targetPlayer].y) > 8) {
 						var dir = Math.atan2(PLAYER_LIST[self.targetPlayer].y - self.y, PLAYER_LIST[self.targetPlayer].x - self.x) * 180 / Math.PI;
 						self.x += Math.cos(dir/180*Math.PI) * 2;
 						self.y += Math.sin(dir/180*Math.PI) * 2;
 					}
 					
  				} else {
  				}

			} catch(err) {

			}
		}
		if(self.hp <= 0) {
			delete ATTACKER_LIST[self.id];
		}
	}

	return self;
}

// Bullet object
var Bullet = function(id, ownerID, x, y, angle, size) {
	var self = {
		size:size,
		id:id,
		lifetime:200,
		x:x,
		y:y,
		xvel:Math.cos(angle/180*Math.PI) * 10,
		yvel:Math.sin(angle/180*Math.PI) * 10,
		owner:ownerID
	}
	self.update = function() {
		self.x += self.xvel;
		self.y += self.yvel;
		self.lifetime--;
		var extraSize = 4 * (self.size - 1);
		for(var p in PLAYER_LIST) {
			var player = PLAYER_LIST[p];
			if(player.joinKickTimeout < 0 && player.spawnCooldown < 0) {
				if (self.x >= (player.x - 8) - extraSize && self.x <= player.x + 8 + extraSize) {
					if (self.y >= (player.y - 8) - extraSize && self.y <= player.y + 8) {
						if(!(self.owner == player.id)) {
							if(!(player.powerupTime > 0)) player.hp--;
							var owner = getPlayerByID(self.owner);
							if(!(owner == undefined)) {
								owner.score += 10;
								if(player.hp <= 0) {
									owner.score += 100;
									owner.score += Math.floor(player.score / 4);
									if(player.doubleFireSpeed)
										owner.score+=500;
									if(player.quadrupleFireSpeed)
										owner.score+=2000;
									if(player.dualBullets)
										owner.score+=1250;
									if(player.quadrupleBullets)
										owner.score+=2000;
									if(player.doubleBulletSize)
										owner.score+=2000;
									if(owner.hp < owner.maxHp) {
										owner.hp++;
									}
								}
							}
							self.lifetime = 0;
						}
					}
				}
			}
		}

		for(var b in BLOCK_LIST) {
			var block = BLOCK_LIST[b];
			if (self.x >= (block.x - 8) - extraSize && self.x <= block.x + 8 + extraSize) {
				if (self.y >= (block.y - 8) - extraSize && self.y <= block.y + 8) {
					delete BLOCK_LIST[block.id];
					var owner = getPlayerByID(self.owner);
					if(!(owner == undefined)) {
						owner.score += 25;
					}
					self.lifetime = 0;
				}
			}
		}

		for(var na in ATTACKER_LIST) {
			var at = ATTACKER_LIST[na];
			if (self.x >= (at.x - 7) - extraSize && self.x <= at.x + 7 + extraSize) {
				if (self.y >= (at.y - 7) - extraSize&& self.y <= at.y + 7 + extraSize) {
					at.hp--;
					var owner = getPlayerByID(self.owner);
					if(!(owner == undefined)) {
						owner.score += 10;
						if(at.hp <= 0) {
							owner.score += 50;
						} 
					}
					self.lifetime = 0;
				}
			}
		}

		for(var s in NPCSHOOTER_LIST) {
			var sh = NPCSHOOTER_LIST[s];
			if (self.x >= (sh.x - 7) - extraSize && self.x <= sh.x + 7 + extraSize) {
				if (self.y >= (sh.y - 7) - extraSize && self.y <= sh.y + 7 + extraSize) {
					sh.hp--;
					var owner = getPlayerByID(self.owner);
					if(!(owner == undefined)) {
						owner.score += 10;
						if(sh.hp <= 0) {
							owner.score += 50;
						}
					} 
					self.lifetime = 0;
				}
			}
		}

		if(self.x < -10 || self.x > 1210) {
			self.lifetime = 0;
		}
		if(self.y < -10 || self.y > 610) {
			self.lifetime = 0;
		}

		if(self.lifetime <= 0) {
			delete BULLET_LIST[self.id];
			delete self;
		}
	}
	return self;
}

// NPCBlock object
var NPCBlock = function(id) {
	var self = {
		id:id,
		x:Math.floor(Math.random() * 1180) + 10,
		y:Math.floor(Math.random() * 580) + 10
	}
	return self;
}

// Player object
var Player = function(id) {
	var self = {
		x:Math.floor(Math.random() * 1160) + 20,
		y:Math.floor(Math.random() * 560) + 20,
		id:id,
		spawnCooldown:-1,
		afkKickTimeout:100,
		joinKickTimeout:10,
		pressingRight:false,
		pressingLeft:false,
		pressingUp:false,
		pressingDown:false,
		maxHp:10,
		hp:10,
		regen:-1,
		afk:false,
		mx:0,
		my:0,
		powerupTime:-1,
		score:0,
		maxSpd:3,
		name:"Unnamed",
		doubleFireSpeed:false,
		doubleBulletSize:false,
		quadrupleFireSpeed:false,
		dualBullets:false,
		quadrupleBullets:false,
		upgHPPrice:500
	}

	self.respawn = function() {
		self.x = Math.floor(Math.random() * 1160) + 20;
		self.y = Math.floor(Math.random() * 560) + 20;
		self.pressingRight = false;
		self.pressingLeft = false;
		self.pressingUp = false;
		self.pressingDown = false;
		self.hp = 10;
		self.powerupTime = -1;
		self.score = Math.round(self.score / 3);

		if(self.doubleFireSpeed) self.score += 400;
		if(self.quadrupleFireSpeed) self.score += 1600;
		if(self.doubleBulletSize) self.score += 1600;
		if(self.dualBullets) self.score += 1000;
		if(self.quadrupleBullets) self.score += 1600;

		self.maxHp = 10;
		self.regen = -1;
		self.maxSpd = 3;
		self.doubleFireSpeed = false;
		self.quadrupleFireSpeed = false;
		self.doubleBulletSize = false;
		self.dualBullets = false;
		self.quadrupleBullets = false;
		self.upgHPPrice = 500;
		self.spawnCooldown = 20;
	}

	self.fireBullet = function() {
		if(self.joinKickTimeout < 0 && self.spawnCooldown < 0) {
			var bsize = 1;
			if(self.doubleBulletSize) bsize = 1.5;
			var id = Math.random() * 200;
			BULLET_LIST[id] = Bullet(id, self.id, self.x, self.y, Math.atan2(self.my - self.y, self.mx - self.x) * 180 / Math.PI, bsize);
			if(self.dualBullets) {
				id = Math.random() * 200;
				BULLET_LIST[id] = Bullet(id, self.id, self.x, self.y, (Math.atan2(self.my - self.y, self.mx - self.x) * 180 / Math.PI)-180, bsize);
				if(self.quadrupleBullets) {
					id = Math.random() * 200;
					BULLET_LIST[id] = Bullet(id, self.id, self.x, self.y, (Math.atan2(self.my - self.y, self.mx - self.x) * 180 / Math.PI)-90, bsize);
					id = Math.random() * 200;
					BULLET_LIST[id] = Bullet(id, self.id, self.x, self.y, (Math.atan2(self.my - self.y, self.mx - self.x) * 180 / Math.PI)-270, bsize);
				}
			}
		}
	}

	self.update = function() {
		if(self.powerupTime > 0) {
			self.maxSpd = 6;
		} else {
			self.maxSpd = 3;
		}
		if(self.hp <= 0) {
			self.respawn();
			return;
		}
		if(self.spawnCooldown < 0) {
			if(self.pressingRight) {
				if(self.x < (1200 - self.maxSpd) - 10) {
					self.x += self.maxSpd;
				}
			}
			if(self.pressingLeft) {
				if(self.x > (0 + self.maxSpd) + 10) {
					self.x -= self.maxSpd;
				}
			}
			if(self.pressingUp) {
				if(self.y > (0 + self.maxSpd) + 10) {
					self.y -= self.maxSpd;
				}
			}
			if(self.pressingDown) {
				if(self.y < (600 - self.maxSpd) - 10) {
					self.y += self.maxSpd;
				}
			}
		}
	}
	return self;
}

//Powerup object
var PowerUp = function(x, y, id) {
	var self = {
		x:x,
		y:y,
		id:id
	};

	self.update = function() {
		for(var p in PLAYER_LIST) {
			var player = PLAYER_LIST[p];
			if(getDistance(self.x, self.y, player.x, player.y) < 10) {
				player.powerupTime += 20;
				player.score += 500;
				self.destroy();
			}
		}
	}

	self.destroy = function() {
		delete POWERUP_LIST[self.id];
		delete self;
	}

	return self;
}

function getPlayerByID(id) {
	for(var p in PLAYER_LIST) {
		var player = PLAYER_LIST[p];
		if(player.id == id) {
			return player;
		}
	}
}

function getDistance(x1, y1, x2, y2) {
	var a = x1 - x2;
	var b = y1 - y2;

	var c = Math.sqrt( a*a + b*b );
	return c;
}

function getSmallest(obj) {
	var min,key;
	for(var k in obj)
	{
		if(typeof(min)=='undefined')
		{
			min=obj[k];
			key=k;
			continue;
		}
		if(obj[k]<min)
		{
			min=obj[k]; 
			key=k;
		}
	}
	return key;
}

function countActivePlayers() {
	var result = 0;
	for(var p in PLAYER_LIST) {
		var player = PLAYER_LIST[p];
		if(player.joinKickTimeout < 0 && player.spawnCooldown < 0) {
			result++;
		}
	}
	return result;
}

function isOP(player) {
	if((player.joinKickTimeout < 0 && player.spawnCooldown < 0 && player.doubleFireSpeed && player.quadrupleFireSpeed && player.dualBullets && player.quadrupleBullets) || (player.doubleFireSpeed && player.dualBullets && player.doubleBulletSize)) {
		return true;
	} else {
		return false;
	}
}

function countOPPlayers() {
	var result = 0;
	for(var p in PLAYER_LIST) {
		var player = PLAYER_LIST[p];
		if(isOP(player)) {
			result++;
		}
	}
	return result;
}

function spawnBlock() {
	var id = (Math.random() * 10);
	BLOCK_LIST[id] = NPCBlock(id);
	return id;
}

function spawnAttacker() {
	var id = (Math.random() * 10);
	var x = Math.floor(Math.random() * 1180) + 10;
	var y = Math.floor(Math.random() * 580) + 10;
	ATTACKER_LIST[id] = NPCAttacker(id, x, y);
	return id;
}

function spawnShooter() {
	var id = (Math.random() * 10);
	var x = Math.floor(Math.random() * 1180) + 10;
	var y = Math.floor(Math.random() * 580) + 10;
	NPCSHOOTER_LIST[id] = NPCShooter(id, x, y);
	return id;
}

io.sockets.on("connection", function(socket) {
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	var player = Player(socket.id);
	PLAYER_LIST[socket.id] = player;
	console.log(colors.cyan("[jsShooter] Socket connection with id " + socket.id));
	socket.emit("id", {
		id:socket.id
	});
	
	socket.on("disconnect", function() {
		for(var b in BULLET_LIST) {
			var bullet = BULLET_LIST[b];
			if(bullet.owner == socket.id) {
				delete BULLET_LIST[b];
			}
		}
		delete SOCKET_LIST[socket.id];
		delete PLAYER_LIST[socket.id];
		console.log(colors.cyan("[jsShooter] Player with id " + socket.id + " disconnected"));
	});

	socket.on('keyPress',function(data){
		try {
			if(data.inputId === 'left')
				player.pressingLeft = data.state;
			else if(data.inputId === 'right')
				player.pressingRight = data.state;
			else if(data.inputId === 'up')
				player.pressingUp = data.state;
			else if(data.inputId === 'down')
				player.pressingDown = data.state;
		} catch(err) {
		}
	});

	socket.on('changeName', function(data) {
		try {
			var player = getPlayerByID(socket.id);
			console.log(colors.cyan("[jsShooter] Player with id " + socket.id + " changed name to " + data.name));
			player.name = data.name;
		} catch(err) {
			
		}
	});

	socket.on('not afk', function(data) {
		try {
			var player = getPlayerByID(socket.id);
			player.afkKickTimeout = 100;
		} catch(err) {}
	});

	socket.on('kthx',function(data){
		var player = getPlayerByID(socket.id);
		if(!(player == undefined)) {
			player.joinKickTimeout = -1;
			console.log(colors.cyan("[jsShooter] Player with id " + socket.id + " is now verified"));
		}
	});

	// HP Upgrade
	socket.on('upgHPClicked',function(data){
		var player = getPlayerByID(socket.id);
		if(!(player == undefined)) {
			if(player.score >= player.upgHPPrice) {
				player.maxHp++;
				player.score-=player.upgHPPrice;
				player.upgHPPrice+=250;
				if(player.hp < player.maxHp) {
					player.hp++;
				}
			}
		}
	});

	// Fire speed upgrade
	socket.on('upgFSpeedClicked',function(data){
		var player = getPlayerByID(socket.id);
		if(!(player == undefined)) {
			if(!player.doubleFireSpeed) {
				if(player.score >= 2000) {
					player.doubleFireSpeed = true;
					player.score-=2000;
				}
			} else if(!player.quadrupleFireSpeed) {
				if(player.score >= 8000) {
					player.quadrupleFireSpeed = true;
					player.score-=8000;
				}
			}
		}
	});

	// Bullet size upgrade
	socket.on('upgBulletSize',function(data){
		var player = getPlayerByID(socket.id);
		if(!(player == undefined)) {
			if(!player.doubleBulletSize) {
				if(player.score >= 5000) {
					player.doubleBulletSize = true;
					player.score-=5000;
				}
			}
		}
	});	

	// Dual bullet upgrade
	socket.on('upgDualBullets', function() {
		var player = getPlayerByID(socket.id);
		if(!(player == undefined)) {
			if(!player.dualBullets) {
				if(player.score >= 5000) {
					player.dualBullets = true;
					player.score-=5000;
				}
			} else {
				if(player.score >= 8000) {
					player.quadrupleBullets = true;
					player.score-=8000;
				}
			}
		}
	});

	socket.on('mouseMove',function(data){
		try {
			var player = getPlayerByID(socket.id);
			if(player != undefined && data.x != undefined && data.y != undefined) {
				player.mx = data.x;
				player.my = data.y;
			}
		} catch(err) {
		}
	});
});

// Bullet fire loop
setInterval(function() {
	for(var p in PLAYER_LIST) {
		var player = PLAYER_LIST[p];
		player.fireBullet();
	}
	setTimeout(function() {
		for(var p in PLAYER_LIST) {
			var player = PLAYER_LIST[p];
			if(player.joinKickTimeout < 0 && player.spawnCooldown < 0) {
				if(player.doubleFireSpeed) {
					player.fireBullet();
				}
			}
		}
	}, 150);
	setTimeout(function() {
		for(var p in PLAYER_LIST) {
			var player = PLAYER_LIST[p];
			if(player.joinKickTimeout < 0 && player.spawnCooldown < 0) {
				if(player.quadrupleFireSpeed) {
					player.fireBullet();
				}
			}
		}
	}, 50);
	setTimeout(function() {
		for(var p in PLAYER_LIST) {
			var player = PLAYER_LIST[p];
			if(player.joinKickTimeout < 0 && player.spawnCooldown < 0) {
				if(player.quadrupleFireSpeed) {
					player.fireBullet();
				}
			}
		}
	}, 200);
}, 250);

// Spawn blocks
setInterval(function() {
	if(Object.keys(BLOCK_LIST).length < 30) {
		spawnBlock();
	}
}, 500);

// Spawn attackers
setInterval(function() {
	if(Object.keys(ATTACKER_LIST).length < 3) {
		if(countActivePlayers() > 0) {
			spawnAttacker();
		}
	}
}, 10000);

// Player respawn cooldown
setInterval(function() {
	try {
		for(var p in PLAYER_LIST) {
			var player = PLAYER_LIST[p];
			if(!(player.spawnCooldown < 0)) {
				player.spawnCooldown--;
			}
			if(player.powerupTime > 0) {
				player.powerupTime--;
			} else {
				player.powerupTime = -1;
			}
		}
	}catch(err) {};
}, 1000);

// Spawn and despawn shooters
setInterval(function() {
	var r = 20;
	if(countOPPlayers() > 0) {
		r = 4;
	}
	if(Object.keys(NPCSHOOTER_LIST).length < 5 && Math.floor(Math.random() * r) == 1) {
		if(countActivePlayers() > 0) {
			spawnShooter();
		}
	}
	if(countActivePlayers() < 1) {
		for(var s in NPCSHOOTER_LIST) {
			var sh = NPCSHOOTER_LIST[s];
			if(Math.floor(Math.random() * 30) == 1) {
				sh.hp = 0;
				break;
			}
		}
	}
}, 1000);

// NPCAttacker and NPCShooter loop
setInterval(function() {
	try {
		for(var na in ATTACKER_LIST) {
			var a = ATTACKER_LIST[na];
			if(!a.activationTimer > 0) {
				for(var p in PLAYER_LIST) {
					var player = PLAYER_LIST[p];

					if(getDistance(a.x, a.y, player.x, player.y) < 10 && player.powerupTime < 1) {
						player.hp --;
						if(player.hp <= 0) {
							a.hp = 10;
						}
					}
				}
			}
		}
		for(var s in NPCSHOOTER_LIST) {
			var sh = NPCSHOOTER_LIST[s];
			if(sh.targetPlayer > 0) {
				sh.fireBullet();
			}
		}
		if(countOPPlayers() > 0) {
			setTimeout(function() {
				for(var s in NPCSHOOTER_LIST) {
					var sh = NPCSHOOTER_LIST[s];
					if(sh.targetPlayer > 0) {
						sh.fireBullet();
					}
				}
			}, 500);
		}
	} catch(er) {
		console.log(er);
	}
}, 1000);

// AFK Test loop
setInterval(function() {
	for(var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit("afk?", {});
	}
}, 1000);

// Powerup spawn loop
setInterval(function() {
	if(!(Object.keys(POWERUP_LIST).length > 0)) {
		if(Math.floor(Math.random() * 150) == 1) {
			if(countActivePlayers() > 0) {
				var sID = Math.random();
				var x = Math.floor(Math.random() * 1180) + 10;
				var y = Math.floor(Math.random() * 580) + 10;
				POWERUP_LIST[sID] = PowerUp(x, y, sID);
			}
		}
	}
}, 1000);

// Regen and kick loop
setInterval(function() {
	for(var p in PLAYER_LIST) {
		var player = PLAYER_LIST[p];
		player.afkKickTimeout--;
		if(player.hp < player.maxHp) {
			if(player.regen < 0) {
				player.regen = 50;
			}
		}
		if(player.regen >= 0) {
			player.regen--;
		}
		if(player.regen == 0) {
			if(player.hp < player.maxHp) {
				player.hp++;
			}
		}
		if(player.joinKickTimeout > 0) {
			player.joinKickTimeout--;
		}
		if(player.joinKickTimeout == 0 || player.afkKickTimeout <= 0) {
			delete PLAYER_LIST[player.id];
			delete SOCKET_LIST[player.id];
			console.log(colors.red("[jsShooter] Kicked " + player.id + " for inactivity"));
		}
	}
}, 100);

// Main update loop
setInterval(function() {
	try {
		var pack = [];
		var playerPack = [];
		var bulletPack = [];
		var blockPack = [];
		var shooterPack = [];
		var attackerPack = [];
		var powerupPack = [];
		for(var p in PLAYER_LIST) {
			var player = PLAYER_LIST[p];
			player.update();

			if(player.joinKickTimeout < 0) {
				playerPack.push({
					type:1,
					x:player.x,
					y:player.y,
					name:player.name,
					hp:player.hp,
					maxHp:player.maxHp,
					score:player.score,
					id:player.id,
					powerupTime:player.powerupTime,
					spawnCooldown:player.spawnCooldown
				});
				var socket = SOCKET_LIST[p];
				socket.emit("price", {
					upgHP:player.upgHPPrice,
					score:player.score,
					doubleBulletSize:player.doubleBulletSize,
					doubleFireSpeed:player.doubleFireSpeed,
					quadrupleFireSpeed:player.quadrupleFireSpeed,
					quadrupleBullets:player.quadrupleBullets,
					dualBullets:player.dualBullets
				});
			}
		}

		for(var b in BULLET_LIST) {
			var bullet = BULLET_LIST[b];
			bullet.update();
			bulletPack.push({
				type:2,
				size:bullet.size,
				x:bullet.x,
				y:bullet.y,
				id:bullet.id,
				ownerID:bullet.owner
			});
		}

		for(var pu in POWERUP_LIST) {
			var powerup = POWERUP_LIST[pu];
			powerup.update();
			powerupPack.push({
				x:powerup.x,
				y:powerup.y,
				id:powerup.id
			});
		}

		for(var bl in BLOCK_LIST) {
			var block = BLOCK_LIST[bl];
			blockPack.push({
				x:block.x,
				y:block.y
			});
		}

		for(var at in ATTACKER_LIST) {
			var attacker = ATTACKER_LIST[at];
			attacker.update();
			attackerPack.push({
				x:attacker.x,
				y:attacker.y,
				activationTimer:attacker.activationTimer
			});
		}

		for(var s in NPCSHOOTER_LIST) {
			var sh = NPCSHOOTER_LIST[s];
			sh.update();
			shooterPack.push({
				x:sh.x,
				y:sh.y,
				target:sh.targetPlayer,
				activationTimer:sh.activationTimer
			});
		}

		for(var i in SOCKET_LIST) {
			var socket = SOCKET_LIST[i];
			socket.emit("newPositions", {
				players:playerPack,
				powerups:powerupPack,
				bullets:bulletPack,
				blocks:blockPack,
				attackers:attackerPack,
				shooters:shooterPack
			});
		}
	} catch(err) {
		console.log(colors.red("[jsShooter] (Warning) Crash during main update loop. " + err));
	}
},(1000 / fps));

// Error correcting loop
setInterval(function() {
	for(var p in PLAYER_LIST) {
		var player = PLAYER_LIST[p];
		if(player.hp > player.maxHp) {
			player.hp = player.maxHp;
		}
	}
}, 5000);

//Spawn 20 block at start
for(var spBlock = 0; spBlock < 20; spBlock++) {
	spawnBlock();
}
console.log(colors.green("[jsShooter] Server started "));