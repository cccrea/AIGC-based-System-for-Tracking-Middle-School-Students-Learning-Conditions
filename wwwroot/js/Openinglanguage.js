const text = "AI transforms learning with personalized and innovative methods.";

let index = 0;
const speed = 50;
function typeText() {
    if (index < text.length) {
        document.getElementById("animated-text").innerHTML += text.charAt(index);
        index++;
        setTimeout(typeText, speed);
    }
}
window.onload = function () {
    typeText();
};

