var express = require('express');
var app = express();
var serv = require('http').Server(app);
var colors = require('colors/safe');

console.log(colors.green("starting server..."));

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

var port = process.env.PORT || 80;
serv.listen(port);
var io = require("socket.io")(serv, {});

console.log(colors.green("Server started on port " + port));

var SOCKET_LIST = {};
var PLAYER_LIST = {};
var BULLET_LIST = {};
var BLOCK_LIST = {};

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
							if(!(owner == null)) {
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
			if (self.x >= block.x - 6 && self.x <= block.x + 6) {
				if (self.y >= block.y - 6 && self.y <= block.y + 6) {
					delete BLOCK_LIST[block.id];
					var owner = getPlayerByID(self.owner);
					if(!(owner == null)) {
						owner.score += 25;
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
		x:Math.floor(Math.random() * 1200),
		y:Math.floor(Math.random() * 600),
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
		dfs:false,
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

function spawnBlock() {
	var id = (Math.random() * 10);
	BLOCK_LIST[id] = NPCBlock(id);
	return id;
}

io.sockets.on("connection", function(socket) {
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	
	var player = Player(socket.id);
	PLAYER_LIST[socket.id] = player;
	console.log(colors.cyan("Socket connection with id " + socket.id));
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
		console.log(colors.cyan("Player with id " + socket.id + " disconnected"));
	});
    socket.on('keyPress',function(data){
        if(data.inputId === 'left')
            player.pressingLeft = data.state;
        else if(data.inputId === 'right')
            player.pressingRight = data.state;
        else if(data.inputId === 'up')
            player.pressingUp = data.state;
        else if(data.inputId === 'down')
            player.pressingDown = data.state;
    });

    socket.on('kthx',function(data){
        var player = getPlayerByID(socket.id);
        if(!(player == null)) {
        	player.joinKickTimeout = -1;
        	console.log(colors.cyan("Player with id " + socket.id + " is now verified"));
        }
    });
    socket.on('upgHPClicked',function(data){
        var player = getPlayerByID(socket.id);
        if(!(player == null)) {
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

    socket.on('upgFSpeedClicked',function(data){
        var player = getPlayerByID(socket.id);
        if(!(player == null)) {
        	if(!player.dfs) {
        		if(player.score >= 2000) {
        			player.dfs = true;
        			player.score-=2000;
        		}
        	}
        }
    });
    socket.on('mouseMove',function(data){
        var player = getPlayerByID(socket.id);
        if(player != null && data.x != null && data.y != null) {
        	player.mx = data.x;
        	player.my = data.y;
        }
    });

});

// Bullet fire loop
setInterval(function() {
	for(var p in PLAYER_LIST) {
		var player = PLAYER_LIST[p];
		if(player.joinKickTimeout < 0) {
			var id = Math.random() * 100;
			BULLET_LIST[id] = Bullet(id, player.id, player.x, player.y, Math.atan2(player.my - player.y, player.mx - player.x) * 180 / Math.PI);
		}
	}
	setTimeout(function() {
		for(var p in PLAYER_LIST) {
			var player = PLAYER_LIST[p];
			if(player.joinKickTimeout < 0) {
				if(player.dfs) {
					var id = Math.random() * 100;
					BULLET_LIST[id] = Bullet(id, player.id, player.x, player.y, Math.atan2(player.my - player.y, player.mx - player.x) * 180 / Math.PI);
				}
			}
		}
	}, 150);
}, 250);

// Spawn blocks
setInterval(function() {
	var size = 0;
	for(var i in BLOCK_LIST) {
		size++;
	}

	if(size < 10) {
		spawnBlock();
	}
}, 2500);

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
			console.log(colors.red("Kicked " + player.id + " for inactivity"));
		}
	}
}, 100);

// Main update loop
setInterval(function() {
	var pack = [];
	var playerPack = [];
	var bulletPack = [];
	var blockPack = [];
	for(var p in PLAYER_LIST) {
		var player = PLAYER_LIST[p];
		player.update();

		if(player.joinKickTimeout < 0) {
			playerPack.push({
				type:1,
				x:player.x,
				y:player.y,
				hp:player.hp,
				maxHp:player.maxHp,
				score:player.score,
				id:player.id
			});
			var socket = SOCKET_LIST[p];
			socket.emit("price", {
				upgHP:player.upgHPPrice,
				score:player.score,
				dfs:player.dfs
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

	pack.push({
		players:playerPack,
		bullets:bulletPack,
		blocks:blockPack
	});
	for(var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit("newPositions", pack);
	}


},(1000 / 25));

//Spawn 5 block at start
for(var spBlock = 0; spBlock < 5; spBlock++) {
	spawnBlock();
}