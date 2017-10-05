var express = require('express');
var app = express();
var serv = require('http').Server(app);
var colors = require('colors/safe');

console.log(colors.green("[jsShooter] Starting server..."));

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

var port = process.env.PORT || 80;
serv.listen(port);
var io = require("socket.io")(serv, {});

console.log(colors.green("[jsShooter] Server started on port " + port));

var SOCKET_LIST = {};
var PLAYER_LIST = {};
var BULLET_LIST = {};
var BLOCK_LIST = {};
var ATTACKER_LIST = {};
var NPCSHOOTER_LIST = {};

// Npc shooter object
var NPCShooter = function(id, x, y) {
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
					var d = getDistance(self.x, self.y, player.x, player.y);
					dist[player.id] = d;
				}
				var target = getSmallest(dist);
				if(!(target == undefined)) {
					self.targetPlayer = target;
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
		hp:10,
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
					var d = getDistance(self.x, self.y, player.x, player.y);
					dist[player.id] = d;
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
var Bullet = function(id, ownerID, x, y, angle) {
	var self = {
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
		for(var p in PLAYER_LIST) {
			var player = PLAYER_LIST[p];
			if(player.joinKickTimeout < 0) {
				if (self.x >= player.x - 8 && self.x <= player.x + 8) {
					if (self.y >= player.y - 8 && self.y <= player.y + 8) {
						if(!(self.owner == player.id)) {
							player.hp--;
							var owner = getPlayerByID(self.owner);
							if(!(owner == undefined)) {
								owner.score += 10;
								if(player.hp <= 0) {
									owner.score += 100;
									owner.score += Math.floor(player.score / 4);
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
			if (self.x >= block.x - 7 && self.x <= block.x + 7) {
				if (self.y >= block.y - 7 && self.y <= block.y + 7) {
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
			if (self.x >= at.x - 7 && self.x <= at.x + 7) {
				if (self.y >= at.y - 7 && self.y <= at.y + 7) {
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
			if (self.x >= sh.x - 7 && self.x <= sh.x + 7) {
				if (self.y >= sh.y - 7 && self.y <= sh.y + 7) {
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
		x:Math.floor(Math.random() * 1180) + 10,
		y:Math.floor(Math.random() * 580) + 10,
		id:id,
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
		score:0,
		maxSpd:3,
		name:"Unnamed",
		dfs:false,
		dualBullets:false,
		quadrupleBullets:false,
		upgHPPrice:500
	}

	self.respawn = function() {
		self.x = Math.floor(Math.random() * 1200);
		self.y = Math.floor(Math.random() * 600);
		self.pressingRight = false;
		self.pressingLeft = false;
		self.pressingUp = false;
		self.pressingDown = false;
		self.hp = 10;
		self.score = 0;
		self.maxHp = 10;
		self.regen = -1;
		self.maxSpd = 3;
		self.dfs = false;
		self.dualBullets = false;
		self.quadrupleBullets = false;
		self.upgHPPrice = 500;
	}

	self.update = function() {
		if(self.hp <= 0) {
			self.respawn();
			return;
		}

		if(self.pressingRight) {
			if(self.x < (1200 - self.maxSpd)) {
				self.x += self.maxSpd;
			}
		}
		if(self.pressingLeft) {
			if(self.x > (0 + self.maxSpd)) {
				self.x -= self.maxSpd;
			}
		}
		if(self.pressingUp) {
			if(self.y > (0 + self.maxSpd)) {
				self.y -= self.maxSpd;
			}
		}
		if(self.pressingDown) {
			if(self.y < (600 - self.maxSpd)) {
				self.y += self.maxSpd;
			}
		}
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
			player.name = data.name;
		} catch(err) {
			
		}
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
			if(!player.dfs) {
				if(player.score >= 2000) {
					player.dfs = true;
					player.score-=2000;
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
		if(player.joinKickTimeout < 0) {
			var id = Math.random() * 200;
			BULLET_LIST[id] = Bullet(id, player.id, player.x, player.y, Math.atan2(player.my - player.y, player.mx - player.x) * 180 / Math.PI);
			if(player.dualBullets) {
				id = Math.random() * 200;
				BULLET_LIST[id] = Bullet(id, player.id, player.x, player.y, (Math.atan2(player.my - player.y, player.mx - player.x) * 180 / Math.PI)-180);
				if(player.quadrupleBullets) {
					id = Math.random() * 200;
					BULLET_LIST[id] = Bullet(id, player.id, player.x, player.y, (Math.atan2(player.my - player.y, player.mx - player.x) * 180 / Math.PI)-90);
					id = Math.random() * 200;
					BULLET_LIST[id] = Bullet(id, player.id, player.x, player.y, (Math.atan2(player.my - player.y, player.mx - player.x) * 180 / Math.PI)-270);
				}
			}
		}
	}
	setTimeout(function() {
		for(var p in PLAYER_LIST) {
			var player = PLAYER_LIST[p];
			if(player.joinKickTimeout < 0) {
				if(player.dfs) {
					var id = Math.random() * 200;
					BULLET_LIST[id] = Bullet(id, player.id, player.x, player.y, Math.atan2(player.my - player.y, player.mx - player.x) * 180 / Math.PI);
					if(player.dualBullets) {
						id = Math.random() * 200;
						BULLET_LIST[id] = Bullet(id, player.id, player.x, player.y, (Math.atan2(player.my - player.y, player.mx - player.x) * 180 / Math.PI)-180);
						if(player.quadrupleBullets) {
							id = Math.random() * 200;
							BULLET_LIST[id] = Bullet(id, player.id, player.x, player.y, (Math.atan2(player.my - player.y, player.mx - player.x) * 180 / Math.PI)-90);
							id = Math.random() * 200;
							BULLET_LIST[id] = Bullet(id, player.id, player.x, player.y, (Math.atan2(player.my - player.y, player.mx - player.x) * 180 / Math.PI)-270);
						}
					}
				}
			}
		}
	}, 150);
}, 250);

// Spawn blocks
setInterval(function() {
	if(Object.keys(BLOCK_LIST).length < 20) {
		spawnBlock();
	}
}, 2500);

// Spawn attackers
setInterval(function() {
	if(Object.keys(ATTACKER_LIST).length < 3) {
		spawnAttacker();
	}
}, 10000);

// Spawn shooters
setInterval(function() {
	if(Object.keys(NPCSHOOTER_LIST).length < 1) {
		spawnShooter();
	}
}, 12000);

// NPCAttacker and NPCShooter loop
setInterval(function() {
	for(var na in ATTACKER_LIST) {
		var a = ATTACKER_LIST[na];
		if(!a.activationTimer > 0) {
			for(var p in PLAYER_LIST) {
				var player = PLAYER_LIST[p];

				if(getDistance(a.x, a.y, player.x, player.y) < 10) {
					player.hp --;
					if(player.hp <= 0) {
						a.hp = 10;
					}
				}
			}
		}
	}

	try {
		for(var s in NPCSHOOTER_LIST) {
			var sh = NPCSHOOTER_LIST[s];
			if(sh.targetPlayer > 0) {
				var id = Math.random() * 200;
				var target = PLAYER_LIST[sh.targetPlayer];
				BULLET_LIST[id] = Bullet(id, -1, sh.x, sh.y, Math.atan2(target.y - sh.y, target.x - sh.x) * 180 / Math.PI);
			}
		}
	} catch(er) {
		console.log(er);
	}
}, 1000);

// Regen and kick loop
setInterval(function() {
	for(var p in PLAYER_LIST) {
		var player = PLAYER_LIST[p];
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
		if(player.joinKickTimeout == 0) {
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
					id:player.id
				});
				var socket = SOCKET_LIST[p];
				socket.emit("price", {
					upgHP:player.upgHPPrice,
					score:player.score,
					dfs:player.dfs,
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
				x:bullet.x,
				y:bullet.y,
				id:bullet.id,
				ownerID:bullet.owner
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
				activationTimer:sh.activationTimer
			});
		}

		pack.push({
			players:playerPack,
			bullets:bulletPack,
			blocks:blockPack,
			attackers:attackerPack,
			shooters:shooterPack
		});

		for(var i in SOCKET_LIST) {
			var socket = SOCKET_LIST[i];
			socket.emit("newPositions", pack);
		}
	} catch(err) {
		console.log(colors.red("[jsShooter] (Warning) Crash during main update loop. " + err));
	}
},(1000 / 25));

//Spawn 5 block at start
for(var spBlock = 0; spBlock < 5; spBlock++) {
	spawnBlock();
}