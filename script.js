const languageData = {
  en: {
    aboutTitle: "About Us",
    aboutText: "Cozy restaurant in Cascais offering fresh dishes and a beautiful space for private events.",
    menuTitle: "Our Menu",
    starters: "Starters",
    mains: "Main Dishes",
    starterItems: [
      "Bread, butter & olives",
      "Garlic shrimp",
      "Gratinated cheese"
    ],
    mainItems: [
      "Grilled octopus",
      "Beef steak",
      "Salmon with vegetables"
    ],
    contactTitle: "Contact",
    contactText: "📍 Rua Principal, Cascais<br>📞 +351 912 345 678"
  },
  pt: {
    aboutTitle: "Sobre Nós",
    aboutText: "Restaurante acolhedor em Cascais com pratos frescos e espaço para eventos privados.",
    menuTitle: "Nosso Menu",
    starters: "Entradas",
    mains: "Pratos Principais",
    starterItems: [
      "Pão, manteiga e azeitonas",
      "Camarão ao alho",
      "Queijo gratinado"
    ],
    mainItems: [
      "Polvo grelhado",
      "Bife de vaca",
      "Salmão com legumes"
    ],
    contactTitle: "Contato",
    contactText: "📍 Rua Principal, Cascais<br>📞 +351 912 345 678"
  },
  fr: {
    aboutTitle: "À propos",
    aboutText: "Restaurant chaleureux à Cascais proposant des plats frais et un bel espace pour les événements privés.",
    menuTitle: "Notre Menu",
    starters: "Entrées",
    mains: "Plats Principaux",
    starterItems: [
      "Pain, beurre et olives",
      "Crevettes à l'ail",
      "Fromage gratiné"
    ],
    mainItems: [
      "Poulpe grillé",
      "Steak de boeuf",
      "Saumon avec légumes"
    ],
    contactTitle: "Contact",
    contactText: "📍 Rua Principal, Cascais<br>📞 +351 912 345 678"
  },
  it: {
    aboutTitle: "Chi Siamo",
    aboutText: "Ristorante accogliente a Cascais con piatti freschi e spazio per eventi privati.",
    menuTitle: "Il Nostro Menu",
    starters: "Antipasti",
    mains: "Piatti Principali",
    starterItems: [
      "Pane, burro e olive",
      "Gamberetti all'aglio",
      "Formaggio gratinato"
    ],
    mainItems: [
      "Polpo alla griglia",
      "Bistecca di manzo",
      "Salmone con verdure"
    ],
    contactTitle: "Contatti",
    contactText: "📍 Rua Principal, Cascais<br>📞 +351 912 345 678"
  }
};

document.getElementById('language-select').addEventListener('change', function () {
  const lang = this.value;
  const data = languageData[lang];

  // About section
  document.querySelector('#about h2').innerText = data.aboutTitle;
  document.querySelector('#about p').innerText = data.aboutText;

  // Menu section
  document.querySelector('#menu h2').innerText = data.menuTitle;
  document.querySelectorAll('#menu h3')[0].innerText = data.starters;
  document.querySelectorAll('#menu h3')[1].innerText = data.mains;

  const starterList = document.querySelectorAll('#menu ul')[0];
  const mainList = document.querySelectorAll('#menu ul')[1];

  starterList.innerHTML = "";
  data.starterItems.forEach(item => {
    const li = document.createElement("li");
    li.innerText = item;
    starterList.appendChild(li);
  });

  mainList.innerHTML = "";
  data.mainItems.forEach(item => {
    const li = document.createElement("li");
    li.innerText = item;
    mainList.appendChild(li);
  });

  // Contact section
  document.querySelector('#contact h2').innerText = data.contactTitle;
  document.querySelector('#contact p').innerHTML = data.contactText;
});
