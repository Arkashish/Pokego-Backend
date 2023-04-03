
const { MongoClient } = require("mongodb");
const Express = require("express");
const Cors = require("cors");

const app = Express();

const http = require("http");
const server = http.createServer(app)

const { Server } = require("socket.io");
const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST", "PUT", "DELETE"],
		allowHeaders: [],
		credentials: true,
	},
});

const mongoClient = new MongoClient("mongodb+srv://pokemon:pokemon1234@cluster0.ekvb1mk.mongodb.net/?retryWrites=true&w=majority", {
	useUnifiedTopology: true
	// dbname: "game"
});

let collections = {};
let changeBattle = {};

app.get("/pokemon", async (req, res, next) => {
	try {
		let result = await collections.pokemon.find({}).toArray();
		res.send(result);
	} catch (ex) {
		res.status(500).send({ message: ex.message });
	}
});
app.get("/battle", async (req, res, next) => {
	try {
		let result = await collections.battles.find({}).toArray();
		res.send(result);
	} catch (error) {
		res.status(500).send({ message: error.message });
	}
});

io.on("connection", (socket) => {
	console.log("A client has connected !");
	changeBattle.on("change",(next) => {
		io.on(socket.activeRoom).emit("refresh", next.fullDocument);
	});
            // <h2 className="text-center">BattleId: {battleId}</h2>
			socket.on("join", async (battleId) => {
		try {
			let result = await collections.battles.findOne({ _id: battleId });

			if (result) {
				socket.emit("refresh", result);
			} else {
				let newBattle = await collections.battles.insertOne({
					id: battleId,
					playerOne: {
						pokemon: {},
					},
					playerTwo: {
						pokemon: {},
					},
				});

				socket.emit("refresh", newBattle.ops[0]);
				socket.join(battleId);
				socket.activeRoom = battleId;
			}
		} catch (error) {
			console.log(error);
		}
	});

	socket.on("select", async (player, pokemon) => {
		try {
			if (player == 1) {
				await collections.battle.updateOne(
					{
						_id: socket.activeRoom,
					},
					{
						$set: {
							playerOne: {
								pokemon: pokemon,
							},
						},
					}
				);
			} else {
				await collections.battle.updateOne(
					{
						_id: socket.activeRoom,
					},
					{
						$set: {
							playerTwo: {
								pokemon: pokemon,
							},
						},
					}
				);
			}
		} catch (ex) {
			console.log(ex);
		}
	});
});

const port = 8000;
server.listen(8000,async ()=>{
    try{
        await mongoClient.connect();
        collections.pokemon = mongoClient.db("game").collection("pokemon");
        collections.battles = mongoClient.db("game").collection("battle");
		changeBattle = collections.battles.watch([
			{
				$match: {
					operationType: "update",
				},
			},
			{ fullDocument: "updateLookup" },
		]);
		console.log(`Listening at *${port}`);
        // console.log("Listening at 8000");

    }catch(err){
        console.error(err)
    }

})