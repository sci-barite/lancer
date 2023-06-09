
function sendMessage(thread?: string, options?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) {
    const ui = (!thread && !options ? SpreadsheetApp.getUi() : null);
    const myWebHook = getFWChatWebHook();
    const header = `⚡📲 Send a message on LecToGo Google Chat Space ("${myWebHook.split('/')[5]}")`
    if (!thread) thread = ui?.prompt(`${header}\n\nEnter the thread name:`).getResponseText();
    if (!options) options = getCardFetchRequestOptions({text: ui?.prompt(`${header}\n\nEnter the thread message:`).getResponseText()});
    const response = UrlFetchApp.fetch(myWebHook + (thread ? `&threadKey=${thread}&messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD` : ''), options);
    Logger.log(response);
}

function getCardFetchRequestOptions(card_json: {[key: string]: any}) {
    return {
        method : 'post',
        contentType: 'application/json',
        payload: JSON.stringify(card_json),
        muteHttpExceptions: true
      } as GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;
}

function getRulesSet() {
    type Skill = {[key: string]: string};
    const skills: Skill[] = [];

    skills.push({
        name: 'UNRAVEL',
        ability1: 'Mind',
        ability2: 'Senses',
        spirit: 'Dragon'
    });

    const diceTypes = [4, 6, 8, 10, 12]

    const icons : Map<string, string> = new Map();
    icons.set('Mind', 'https://em-content.zobj.net/thumbs/160/microsoft/319/brain_1f9e0.png');
    icons.set('Senses', 'https://em-content.zobj.net/thumbs/160/microsoft/319/eye_1f441-fe0f.png');
    icons.set('Dragon', 'https://em-content.zobj.net/thumbs/160/microsoft/319/dragon-face_1f432.png');
    icons.set('UNRAVEL', 'https://em-content.zobj.net/thumbs/160/microsoft/319/crystal-ball_1f52e.png');

    const emojis : Map<string, string> = new Map();
    emojis.set('Mind', '🧠');
    emojis.set('Senses', '👁️');
    emojis.set('Dragon', '🐲');

    return {skills: skills, icons: icons, emojis: emojis, diceTypes: diceTypes};
}

function createGridCardJson(args: {
    card_title: string, 
    card_subtitle: string,
    grid_title: string,
    grid_elements: {title: string, subtitle?: string}[]
}) {
    type CardItem = {
        [key: string]: string | number | { type: string } | CardItem | CardItem[];
    };

    const rules = getRulesSet();
    const snake = 'https://em-content.zobj.net/thumbs/160/microsoft/319/crystal-ball_1f52e.png';
    const Props = PropertiesService.getScriptProperties();
    const IDstr = Props.getProperty('sentCardId') ?? '0';
    const header = {
        title: args.card_title, 
        subtitle: args.card_subtitle, 
        imageUrl: rules.icons.get(args.card_title.split(' ')[0]), 
        imageType: "SQUARE"};
    const grid = {
        title: args.grid_title,
        columnCount: 3,
        borderStyle: {
          type: "STROKE",
          cornerRadius: 4.0
        } as CardItem,
        items: [
        ] as CardItem[],
        onClick: {
          openLink: {
            url: "https://developers.google.com/"
          }
        } as CardItem
      };

    args.grid_elements.forEach(element => {
        grid.items.push({
            image: {
                imageUri: rules.icons.get(element.title) || snake,
                cropStyle: {
                  type: "SQUARE"
                },
                borderStyle: {
                  type: "STROKE"
                }
              },
              title: element.title,
              subtitle: element.subtitle || '',
              textAlignment: "CENTER"
        } as CardItem);
    });

    return {
        cards_v2: [{
        card_id: "TestCard-" + IDstr,
        card: {
            header: header,
            sections: [
                {widgets: [{grid: grid}]},
                {widgets: [{
                    textParagraph: {text: "<b>" + 'TOTAL: ' + 
                        eval(grid.items.map(item => (item.subtitle as string).split(': ')[1]).toString().replaceAll(',', '+'))}
                }]}
            ]
        }
      }] as CardItem[]
    };
  }

  function getPlayerSheets() {
    type Player = {
        name: string,
        abilities: {
            '💪': number,
            '🩸': number,
            '🖐️': number,
            '🧠': number,
            '👁️': number,
            '💖': number
        }
        spirits: {
            '🦅': number,
            '🦁': number,
            '🦄': number,
            '🐲': number
        }
    }
    const players : Player[] = [];

    players.push({
        name: 'Mia', 
        abilities: {'💪': 8, '🩸': 10, '🖐️': 4, '🧠': 8, '👁️': 6, '💖': 8}, 
        spirits: {'🦅': 4, '🦁': 4, '🦄': 8, '🐲': 6}
    });

    return players;
  }

  function gridCardTest() {
    const rules = getRulesSet();
    const players = getPlayerSheets();

    const getRolls = (skill: string, sheet: typeof players[0], rulesSet: typeof rules) => {
        const skillIndex = rulesSet.skills.findIndex(element => element.name === skill);
        if (skillIndex < 0) throw new Error(`Skill "${skill}" not found in rules set!`);
        const foundSkill = rulesSet.skills[skillIndex];
        const rolls : {[key: string]: string}[] = [];
        const results : number[] = [];

        Object.values(foundSkill).forEach(attribute => {
            if (attribute === skill) return;
            rolls.push({title: attribute, subtitle: '1dX Roll: Y'})
        });

        rolls.forEach(roll => {
            const emoji = rules.emojis.get(roll.title);
            if (!emoji) throw new Error (`Roll "${roll.title}" doesn't have an associated emoji in rules set!`);
            const die = sheet.abilities[emoji as keyof typeof sheet.abilities] || sheet.spirits[emoji as keyof typeof sheet.spirits];
            if (!die) throw new Error(`Unknown die type: ${emoji}`);
            const rolled = Math.ceil(Math.random() * die);
            roll.subtitle = roll.subtitle.replace('X', die.toString()).replace('Y', rolled.toString());
            results.push(rolled);
        });

        return {rolls_grid: rolls  as { title: string; subtitle?: string}[], rolls_results: results};
    }

    const skill = 'UNRAVEL';
    const playerName = 'Mia';
    const sheet = getPlayerSheets().find(player => player.name === playerName);
    if (!sheet) throw new Error (`Player "${playerName}" doesn't have a recorded character sheet!`);

    const rolls = getRolls(skill, sheet, rules);
    const skillComponents = rolls.rolls_grid.map(roll => roll.title).join(' + ');

    sendMessage(undefined, getCardFetchRequestOptions(createGridCardJson({
        card_title: skill + ' skill check', 
        card_subtitle: playerName,
        grid_title: skillComponents,
        grid_elements: rolls.rolls_grid
    })));
  }