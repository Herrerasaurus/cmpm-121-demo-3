import "./style.css";

const app: HTMLDivElement = document.querySelector("#app")!;
const button = document.createElement("button");
const message = document.createElement("p");

button.addEventListener("click", () => {
    message.innerHTML = "you clicked the button!";
    app.append(message);
});
app.append(button);
