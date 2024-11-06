import "./style.css";

const app = document.getElementById("app");
const button = document.createElement("button");

button.addEventListener("click", () => {
    const message = document.createElement("p");
    message.textContent = "you clicked the button!";
    app?.append(message);
});
app?.append(button);