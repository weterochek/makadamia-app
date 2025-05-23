const express = require("express");
const { exec } = require("child_process");
const app = express();

app.get("/start-server", (req, res) => {
    exec("node server.js", (error, stdout, stderr) => {
        if (error) {
            console.error(`Ошибка запуска сервера: ${error.message}`);
            return res.status(500).send("Ошибка запуска сервера");
        }
        console.log(`Результат запуска: ${stdout}`);
        res.send("Сервер запущен.");
    });
});

app.listen(4000, () => {
    console.log("Вспомогательный сервер запущен на порту 4000");
});
