function findPlacement(tag) {
  const potentialPlacements = document.querySelectorAll(".notion-toggle.bg-blue");
  return Array
    .from(potentialPlacements)
    .find((container) => {
      const containerText = container.innerText;
      return containerText.includes(tag);
    });;
}


export function movePageProperties() {
  const notionPageProperties = document.querySelector(".notion-page__properties");

  if (typeof notionPageProperties === "undefined" || notionPageProperties === null) {
    return;
  }

  const newPagePropertiesPlacement = findPlacement("{{ page_properties }}");

  if (typeof newPagePropertiesPlacement === "undefined" || newPagePropertiesPlacement === null) {
    notionPageProperties.style.display = "none";
    return;
  }

  newPagePropertiesPlacement.after(notionPageProperties);
  newPagePropertiesPlacement.remove();
}
