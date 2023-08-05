const list = document.getElementById("list");
const box = document.getElementById("box");
const btn = document.getElementById("btn");

box.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        btn.click();
    }
});

function addItem(content)
{
    if (content === undefined) {
        content = box.value;
        if (content === null) {
	    return;
        }
    }
    box.value = "";
    
    const item = document.createElement("li");
    const checkBox = document.createElement("input");
    checkBox.type = "checkbox";
    const text = document.createElement("span");
    text.classList.add("clickable");
    text.onclick = removeItem;
    text.textContent = content;

    item.appendChild(checkBox);
    item.appendChild(text);
    list.appendChild(item);
    saveList();
}

function removeItem()
{
    this.parentNode.remove();
    saveList();
}

function saveList()
{
    if (list.innerHTML !== null) {
        localStorage.setItem("list", list.innerHTML);
    }
}

function loadList()
{
    loadedList = localStorage.getItem("list");
    if (loadedList === null) {
        return;
    }
    
    list.insertAdjacentHTML("afterbegin", loadedList);
    list.querySelectorAll("li > span").forEach((span) => {span.onclick = removeItem;});
}

loadList();

