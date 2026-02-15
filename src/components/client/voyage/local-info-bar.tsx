'use client'

import { useState, useEffect } from 'react'
import { Clock, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind } from '@phosphor-icons/react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LocalInfoBarProps {
  countryCode: string | null
  officeCity?: string | null
  officeLat?: number | null
  officeLng?: number | null
}

// ─── Weather icon mapping (WMO weather codes → Phosphor icons) ──────────────

function WeatherIcon({ code, size = 16, className }: { code: number; size?: number; className?: string }) {
  if (code === 0 || code === 1) return <Sun size={size} weight="duotone" className={className} />
  if (code <= 3) return <Cloud size={size} weight="duotone" className={className} />
  if (code <= 48) return <Wind size={size} weight="duotone" className={className} />
  if (code <= 67) return <CloudRain size={size} weight="duotone" className={className} />
  if (code <= 77) return <CloudSnow size={size} weight="duotone" className={className} />
  if (code <= 86) return <CloudRain size={size} weight="duotone" className={className} />
  if (code <= 99) return <CloudLightning size={size} weight="duotone" className={className} />
  return <Sun size={size} weight="duotone" className={className} />
}

// ─── Country data — proverbs with original + French translation ──────────────

interface Proverb {
  original: string  // In the local language
  fr: string        // French translation
}

interface CountryLocalData {
  utcOffset: number
  capital: [number, number]
  proverbs: Proverb[]
  proverbLabel: string
}

const COUNTRY_DATA: Record<string, CountryLocalData> = {
  VN: {
    utcOffset: 7, capital: [21.03, 105.85],
    proverbLabel: 'Proverbe vietnamien',
    proverbs: [
      { original: 'Đi một ngày đàng, học một sàng khôn', fr: 'Un jour de voyage enseigne plus qu\'un an chez soi' },
      { original: 'Có công mài sắt, có ngày nên kim', fr: 'Avec de la persévérance, le fer devient aiguille' },
      { original: 'Học ăn, học nói, học gói, học mở', fr: 'Apprendre à manger, parler, emballer et déballer' },
      { original: 'Ăn quả nhớ kẻ trồng cây', fr: 'En mangeant le fruit, souviens-toi de qui a planté l\'arbre' },
      { original: 'Một cây làm chẳng nên non', fr: 'Un seul arbre ne fait pas une montagne' },
      { original: 'Nước chảy đá mòn', fr: 'L\'eau qui coule use la pierre' },
      { original: 'Tốt gỗ hơn tốt nước sơn', fr: 'Mieux vaut un bon bois qu\'une belle laque' },
      { original: 'Đất lành chim đậu', fr: 'Les oiseaux se posent sur la bonne terre' },
      { original: 'Gần mực thì đen, gần đèn thì sáng', fr: 'Près de l\'encre on noircit, près de la lampe on s\'éclaire' },
      { original: 'Lá lành đùm lá rách', fr: 'Les feuilles intactes protègent les feuilles déchirées' },
    ],
  },
  TH: {
    utcOffset: 7, capital: [13.75, 100.52],
    proverbLabel: 'Proverbe thaïlandais',
    proverbs: [
      { original: 'น้ำขึ้นให้รีบตักน้ำ', fr: 'Quand l\'eau monte, dépêche-toi de puiser' },
      { original: 'ช้าได้ช้าไป', fr: 'Qui va doucement, va sûrement' },
      { original: 'น้ำใสใจจริง', fr: 'L\'eau claire révèle un cœur sincère' },
      { original: 'รู้จักเขา รู้จักเรา', fr: 'Connaître l\'autre, c\'est se connaître soi-même' },
      { original: 'ทำดีได้ดี ทำชั่วได้ชั่ว', fr: 'Fais le bien, reçois le bien ; fais le mal, reçois le mal' },
      { original: 'ขี่ช้างจับตั๊กแตน', fr: 'Monter un éléphant pour attraper une sauterelle' },
      { original: 'สิบปากว่า ไม่เท่าตาเห็น', fr: 'Dix bouches qui parlent ne valent pas des yeux qui voient' },
      { original: 'ปลาหมอตายเพราะปาก', fr: 'Le poisson meurt par sa bouche' },
      { original: 'น้ำพึ่งเรือ เสือพึ่งป่า', fr: 'L\'eau dépend du bateau, le tigre dépend de la forêt' },
      { original: 'มีสลึงพึงบรรจบให้ครบบาท', fr: 'Économise chaque sou et tu auras un baht' },
    ],
  },
  KH: {
    utcOffset: 7, capital: [11.56, 104.92],
    proverbLabel: 'Proverbe khmer',
    proverbs: [
      { original: 'ទឹកជ្រៅកុំស្ទង់ដោយជើង', fr: 'Ne mesure pas la profondeur de l\'eau avec tes pieds' },
      { original: 'ចេះដើរត្រូវចេះគ្រវី', fr: 'Qui sait marcher doit savoir s\'arrêter' },
      { original: 'មេឃស្រអែមកុំទុកចិត្ត', fr: 'Ne te fie pas au ciel serein' },
      { original: 'កុំអង្គុយម្លប់ដើមស្វាយ រង់ចាំឲ្យផ្លែធ្លាក់', fr: 'Ne t\'assieds pas sous le manguier en attendant que les fruits tombent' },
      { original: 'ចេះឈ្នះខ្លួនឯង ជាជ័យជម្នះដ៏ធំ', fr: 'Se vaincre soi-même est la plus grande victoire' },
      { original: 'ទឹកមួយដorg របស់ត្រី', fr: 'L\'eau est la maison du poisson' },
      { original: 'ស្រឡាញ់គេឲ្យសម ស្រឡាញ់ខ្លួនឲ្យខ្លាំង', fr: 'Aime les autres avec mesure, aime-toi avec force' },
      { original: 'មាត់មួយវាមាន រយៈពីរ', fr: 'Une seule bouche a deux tranchants' },
    ],
  },
  LA: {
    utcOffset: 7, capital: [17.97, 102.63],
    proverbLabel: 'Proverbe laotien',
    proverbs: [
      { original: 'ນ້ຳໃສໃຈຈິງ', fr: 'L\'eau claire, le cœur sincère' },
      { original: 'ຢູ່ບ້ານໃດ ກິນເຂົ້າບ້ານນັ້ນ', fr: 'Au village où tu vis, mange le riz de ce village' },
      { original: 'ຊ້າໆ ໄດ້ພ້າ ເລື່ອນ', fr: 'Doucement, on obtient un grand coutelas' },
      { original: 'ເມື່ອເຮົາຕ້ອງການຂ້າມແມ່ນ້ຳ ຕ້ອງເຄົາລົບແມ່ນ້ຳ', fr: 'Pour traverser la rivière, il faut la respecter' },
      { original: 'ນ້ຳບໍ່ໄຫຼ ນ້ຳເນົ່າ', fr: 'L\'eau qui ne coule pas devient stagnante' },
      { original: 'ສາມັກຄີຄືພະລັງ', fr: 'L\'union fait la force' },
      { original: 'ກິນໝາກ ຈື່ຄົນປູກ', fr: 'En mangeant le fruit, souviens-toi de celui qui l\'a planté' },
      { original: 'ການເດີນທາງ ແມ່ນບົດຮຽນ', fr: 'Chaque voyage est une leçon de vie' },
    ],
  },
  MM: {
    utcOffset: 6.5, capital: [16.87, 96.20],
    proverbLabel: 'Proverbe birman',
    proverbs: [
      { original: 'တစ်ယောက်သွား မြန်ပေမယ့် နှစ်ယောက်သွား ဝေးတယ်', fr: 'Seul on va vite, ensemble on va loin' },
      { original: 'ရေစီးရာ ငါးကူးရာ', fr: 'Là où coule l\'eau, le poisson nage' },
      { original: 'စိတ်ရှည်ရှည် ထားပါ', fr: 'Aie de la patience, toujours' },
      { original: 'ပင်လယ်ကျယ်သော်လည်း ကမ်းရှိ', fr: 'Même la mer la plus vaste a un rivage' },
      { original: 'မိုးမခါးခင် ထီးပြင်', fr: 'Répare ton parapluie avant la pluie' },
      { original: 'ရွှေဘုရားမှာ လိမ်မလို့ မရ', fr: 'Devant la pagode d\'or, on ne peut mentir' },
      { original: 'လူကောင်းနဲ့ပေါင်း ကောင်းရာရောက်', fr: 'Fréquente les gens bons, tu iras vers le bien' },
      { original: 'ပညာသည် အကောင်းဆုံးသော လက်နက်', fr: 'Le savoir est la meilleure des armes' },
    ],
  },
  ID: {
    utcOffset: 7, capital: [-6.21, 106.85],
    proverbLabel: 'Proverbe indonésien',
    proverbs: [
      { original: 'Witing tresno jalaran soko kulino', fr: 'L\'amour naît de l\'habitude' },
      { original: 'Air beriak tanda tak dalam', fr: 'L\'eau bruyante est signe de peu de profondeur' },
      { original: 'Tak kenal maka tak sayang', fr: 'On n\'aime pas ce qu\'on ne connaît pas' },
      { original: 'Sedikit demi sedikit, lama-lama jadi bukit', fr: 'Petit à petit, avec le temps, ça fait une colline' },
      { original: 'Di mana bumi dipijak, di situ langit dijunjung', fr: 'Où l\'on pose le pied, on honore le ciel' },
      { original: 'Berakit-rakit ke hulu, berenang-renang ke tepian', fr: 'Rame vers l\'amont, nage vers le rivage' },
      { original: 'Bagai air di daun talas', fr: 'Comme l\'eau sur la feuille de taro' },
      { original: 'Gajah mati meninggalkan gading', fr: 'L\'éléphant meurt mais laisse ses défenses' },
    ],
  },
  IN: {
    utcOffset: 5.5, capital: [28.61, 77.21],
    proverbLabel: 'Proverbe indien',
    proverbs: [
      { original: 'अतिथि देवो भव', fr: 'L\'hôte est l\'égal d\'un dieu' },
      { original: 'जहाँ चाह वहाँ राह', fr: 'Là où il y a la volonté, il y a le chemin' },
      { original: 'अकेला चना भाड़ नहीं फोड़ सकता', fr: 'Un seul pois chiche ne peut faire éclater le four' },
      { original: 'बूँद बूँद से सागर भरता है', fr: 'Goutte à goutte, la mer se remplit' },
      { original: 'जैसा देश वैसा भेष', fr: 'En chaque pays, adopte ses coutumes' },
      { original: 'अंधेरे में एक दीया काफी है', fr: 'Dans l\'obscurité, une seule lampe suffit' },
      { original: 'धीरे धीरे रे मना', fr: 'Doucement, doucement, ô mon cœur' },
      { original: 'पेड़ जितना बड़ा होता है उतना झुकता है', fr: 'Plus l\'arbre est grand, plus il s\'incline' },
    ],
  },
  LK: {
    utcOffset: 5.5, capital: [6.93, 79.85],
    proverbLabel: 'Proverbe sri-lankais',
    proverbs: [
      { original: 'ඉවසීම සුවය ගෙනේ', fr: 'La patience apporte le bonheur' },
      { original: 'වැටුණු තැනින් නැගිටින්න', fr: 'Relève-toi là où tu es tombé' },
      { original: 'ගඟ බැස්ස දිය බොන්න', fr: 'Descends à la rivière pour boire l\'eau' },
      { original: 'එක අතකින් අත ගහන්න බෑ', fr: 'On ne peut applaudir d\'une seule main' },
      { original: 'අහසේ සඳ පායනවා ලෙස', fr: 'Comme la lune qui brille dans le ciel' },
      { original: 'උගත්කම නම් සැබෑ ධනයයි', fr: 'Le savoir est la véritable richesse' },
      { original: 'මිනිසා කියන්නේ මිනිසා ගානයි', fr: 'L\'homme vaut par ses actes' },
      { original: 'වැඩ කරනවා නම් පළමු වැඩ', fr: 'Si tu travailles, commence par le plus important' },
    ],
  },
  NP: {
    utcOffset: 5.75, capital: [27.72, 85.32],
    proverbLabel: 'Proverbe népalais',
    proverbs: [
      { original: 'हिमाल चढ्ने बाटो सजिलो हुँदैन', fr: 'Le chemin vers le sommet n\'est jamais facile' },
      { original: 'धीरे धीरे बाटो कटिन्छ', fr: 'Pas à pas, on parcourt le chemin' },
      { original: 'जहाँ इच्छा, त्यहाँ उपाय', fr: 'Là où il y a la volonté, il y a un moyen' },
      { original: 'एक हातले ताली बज्दैन', fr: 'Une seule main ne peut applaudir' },
      { original: 'पानी बिनको माछा तड्पिन्छ', fr: 'Le poisson sans eau se débat' },
      { original: 'गएको बेला यात्रा हो, फर्कदा अनुभव', fr: 'En partant c\'est un voyage, au retour c\'est l\'expérience' },
      { original: 'सानो काम, ठूलो फल', fr: 'Petit effort, grand résultat' },
      { original: 'पहाड़ हिम्मत माग्छ', fr: 'La montagne demande du courage' },
    ],
  },
  JP: {
    utcOffset: 9, capital: [35.68, 139.69],
    proverbLabel: 'Proverbe japonais',
    proverbs: [
      { original: '七転び八起き', fr: 'Tombe sept fois, relève-toi huit' },
      { original: '花より団子', fr: 'Mieux vaut le riz que les fleurs' },
      { original: '猿も木から落ちる', fr: 'Même le singe tombe de l\'arbre' },
      { original: '一期一会', fr: 'Chaque rencontre est unique' },
      { original: '旅は道連れ世は情け', fr: 'En voyage un compagnon, dans la vie la compassion' },
      { original: '石の上にも三年', fr: 'Trois ans assis sur une pierre et elle devient chaude' },
      { original: '急がば回れ', fr: 'Si tu es pressé, fais un détour' },
      { original: '千里の道も一歩から', fr: 'Un voyage de mille lieues commence par un pas' },
      { original: '郷に入っては郷に従え', fr: 'Au village où tu entres, suis les coutumes' },
      { original: '残り物には福がある', fr: 'Il y a du bonheur dans les restes' },
    ],
  },
  TZ: {
    utcOffset: 3, capital: [-6.79, 39.28],
    proverbLabel: 'Proverbe swahili',
    proverbs: [
      { original: 'Haraka haraka haina baraka', fr: 'La précipitation n\'apporte pas la bénédiction' },
      { original: 'Safari njema', fr: 'Bon voyage' },
      { original: 'Pole pole ndio mwendo', fr: 'Doucement, c\'est le chemin' },
      { original: 'Umoja ni nguvu, utengano ni udhaifu', fr: 'L\'union fait la force, la division la faiblesse' },
      { original: 'Haba na haba hujaza kibaba', fr: 'Peu à peu, on remplit la mesure' },
      { original: 'Asiyefunzwa na mamaye hufunzwa na ulimwengu', fr: 'Celui que sa mère n\'a pas éduqué, le monde s\'en charge' },
      { original: 'Maji yakimwagika hayazoleki', fr: 'L\'eau versée ne se ramasse pas' },
      { original: 'Mgeni siku mbili; siku ya tatu mpe jembe', fr: 'L\'invité deux jours ; le troisième, donne-lui une houe' },
      { original: 'Penye nia pana njia', fr: 'Là où il y a la volonté, il y a un chemin' },
      { original: 'Mvumilivu hula mbivu', fr: 'Le patient mange le fruit mûr' },
    ],
  },
  KE: {
    utcOffset: 3, capital: [-1.29, 36.82],
    proverbLabel: 'Proverbe kenyan',
    proverbs: [
      { original: 'Pole pole ndio mwendo', fr: 'Doucement, c\'est la route' },
      { original: 'Heri kuishi kwa amani kuliko mali', fr: 'Mieux vaut vivre en paix que dans la richesse' },
      { original: 'Asante ya punda ni mateke', fr: 'Le remerciement de l\'âne, c\'est un coup de pied' },
      { original: 'Mwacha mila ni mtumwa', fr: 'Qui abandonne sa culture est un esclave' },
      { original: 'Kidole kimoja hakivunji chawa', fr: 'Un seul doigt n\'écrase pas le pou' },
      { original: 'Dawa ya moto ni moto', fr: 'Le remède du feu, c\'est le feu' },
      { original: 'Samaki mkunje angali mbichi', fr: 'Plie le poisson quand il est encore frais' },
      { original: 'Usipoziba ufa utajenga ukuta', fr: 'Si tu ne colmates pas la fissure, tu reconstruiras le mur' },
    ],
  },
  ZA: {
    utcOffset: 2, capital: [-33.93, 18.42],
    proverbLabel: 'Proverbe zoulou',
    proverbs: [
      { original: 'Umuntu ngumuntu ngabantu', fr: 'Je suis parce que nous sommes' },
      { original: 'Indlela ibuzwa kwabaphambili', fr: 'Le chemin, on le demande à ceux qui sont devant' },
      { original: 'Inkomo ikhuliswa ngamanzi', fr: 'Le bétail grandit grâce à l\'eau' },
      { original: 'Isala kutshelwa sibona ngomopho', fr: 'Celui qui refuse les conseils voit par les blessures' },
      { original: 'Inyoni yakhela ngoboya benye', fr: 'L\'oiseau construit son nid avec les plumes des autres' },
      { original: 'Ubuntu abupheli', fr: 'L\'humanité ne s\'épuise jamais' },
      { original: 'Amanzi ahlanzekile alukhuni ukuwathola', fr: 'L\'eau pure est difficile à trouver' },
      { original: 'Ingane encane idlala emnyango', fr: 'Le petit enfant joue près de la porte' },
    ],
  },
  MA: {
    utcOffset: 1, capital: [33.97, -6.85],
    proverbLabel: 'Proverbe marocain',
    proverbs: [
      { original: 'اللي سافر بزاف عرف بزاف', fr: 'Celui qui voyage beaucoup sait beaucoup' },
      { original: 'الضيف ضيف الله', fr: 'L\'invité est l\'invité de Dieu' },
      { original: 'اللي فاتك بليلة فاتك بحيلة', fr: 'Qui te devance d\'une nuit te devance d\'une ruse' },
      { original: 'الصبر مفتاح الفرج', fr: 'La patience est la clé du soulagement' },
      { original: 'كل واحد وبلادو عزيزة عليه', fr: 'Chacun chérit son pays' },
      { original: 'الماء والخضرة والوجه الحسن', fr: 'L\'eau, la verdure et un beau visage' },
      { original: 'اليد الواحدة ماتصفقش', fr: 'Une seule main n\'applaudit pas' },
      { original: 'الطريق يتعرف بالمشي', fr: 'Le chemin se connaît en marchant' },
    ],
  },
  MG: {
    utcOffset: 3, capital: [-18.88, 47.51],
    proverbLabel: 'Proverbe malgache',
    proverbs: [
      { original: 'Ny fiainana dia toy ny lalana, tsy maintsy izorona', fr: 'La vie est un chemin qu\'il faut parcourir' },
      { original: 'Aza manao hoe tsy ho avy ny rahampitso', fr: 'Ne dis jamais que demain ne viendra pas' },
      { original: 'Ny hazo no vanon-ko, ny tany no ijereko', fr: 'L\'arbre que je façonne, la terre que je contemple' },
      { original: 'Izay tsy mahay mandihy manome tsiny ny lambanana', fr: 'Celui qui ne sait pas danser accuse le sol' },
      { original: 'Aleo very tsikalakalam-bola toy izay very tsikalakalam-pihavanana', fr: 'Mieux vaut perdre de l\'argent que perdre l\'amitié' },
      { original: 'Ny teny toy ny vary an-tanimbary', fr: 'Les mots sont comme le riz dans la rizière' },
      { original: 'Rano lalina, tsy hitam-pototra', fr: 'L\'eau profonde ne laisse pas voir le fond' },
      { original: 'Tandremo ny mason-dolo', fr: 'Prends soin du regard des ancêtres' },
    ],
  },
  CR: {
    utcOffset: -6, capital: [9.93, -84.08],
    proverbLabel: 'Expression costaricienne',
    proverbs: [
      { original: 'Pura Vida', fr: 'La vie pure — tout va bien' },
      { original: 'El que madruga, coge agua clara', fr: 'Celui qui se lève tôt puise l\'eau claire' },
      { original: 'Más vale pájaro en mano que cien volando', fr: 'Mieux vaut un oiseau en main que cent en vol' },
      { original: 'A caballo regalado no se le mira el diente', fr: 'À cheval donné, on ne regarde pas les dents' },
      { original: 'Donde manda capitán, no manda marinero', fr: 'Là où commande le capitaine, le marin obéit' },
      { original: 'El que no arriesga, no gana', fr: 'Qui ne risque rien, ne gagne rien' },
      { original: 'En boca cerrada no entran moscas', fr: 'Bouche fermée, les mouches n\'entrent pas' },
      { original: 'Más sabe el diablo por viejo que por diablo', fr: 'Le diable sait plus par son âge que par sa nature' },
    ],
  },
  PE: {
    utcOffset: -5, capital: [-12.05, -77.04],
    proverbLabel: 'Proverbe péruvien',
    proverbs: [
      { original: 'Al que madruga, Dios le ayuda', fr: 'À celui qui se lève tôt, Dieu l\'aide' },
      { original: 'Ama suwa, ama llulla, ama qella', fr: 'Ne vole pas, ne mens pas, ne sois pas paresseux' },
      { original: 'Más vale maña que fuerza', fr: 'Mieux vaut l\'adresse que la force' },
      { original: 'El que mucho abarca, poco aprieta', fr: 'Qui trop embrasse, mal étreint' },
      { original: 'Dime con quién andas y te diré quién eres', fr: 'Dis-moi qui tu fréquentes, je te dirai qui tu es' },
      { original: 'Camarón que se duerme, se lo lleva la corriente', fr: 'La crevette qui s\'endort se fait emporter par le courant' },
      { original: 'No hay mal que por bien no venga', fr: 'À quelque chose malheur est bon' },
      { original: 'Quien no tiene padrino, no se bautiza', fr: 'Qui n\'a pas de parrain ne se fait pas baptiser' },
    ],
  },
  MX: {
    utcOffset: -6, capital: [19.43, -99.13],
    proverbLabel: 'Proverbe mexicain',
    proverbs: [
      { original: 'El que no arriesga no gana', fr: 'Qui ne risque rien ne gagne rien' },
      { original: 'Agua que no has de beber, déjala correr', fr: 'L\'eau que tu ne dois pas boire, laisse-la couler' },
      { original: 'No hay rosas sin espinas', fr: 'Il n\'y a pas de roses sans épines' },
      { original: 'En la tierra del ciego, el tuerto es rey', fr: 'Au pays des aveugles, le borgne est roi' },
      { original: 'Más vale tarde que nunca', fr: 'Mieux vaut tard que jamais' },
      { original: 'El que busca, encuentra', fr: 'Qui cherche, trouve' },
      { original: 'Dime qué comes y te diré quién eres', fr: 'Dis-moi ce que tu manges, je te dirai qui tu es' },
      { original: 'No todo lo que brilla es oro', fr: 'Tout ce qui brille n\'est pas or' },
      { original: 'Barriga llena, corazón contento', fr: 'Ventre plein, cœur content' },
      { original: 'Cada cabeza es un mundo', fr: 'Chaque tête est un monde' },
    ],
  },
  CO: {
    utcOffset: -5, capital: [4.71, -74.07],
    proverbLabel: 'Proverbe colombien',
    proverbs: [
      { original: 'En tierra de ciegos, el tuerto es rey', fr: 'Au pays des aveugles, le borgne est roi' },
      { original: 'No dejes para mañana lo que puedas hacer hoy', fr: 'Ne remets pas à demain ce que tu peux faire aujourd\'hui' },
      { original: 'El que mucho se despide pocas ganas tiene de irse', fr: 'Celui qui dit trop au revoir n\'a guère envie de partir' },
      { original: 'Loro viejo no aprende a hablar', fr: 'Un vieux perroquet n\'apprend pas à parler' },
      { original: 'Más vale prevenir que lamentar', fr: 'Mieux vaut prévenir que guérir' },
      { original: 'A mal tiempo, buena cara', fr: 'Au mauvais temps, bon visage' },
      { original: 'El que nace para tamal, del cielo le caen las hojas', fr: 'Celui qui est né pour le tamal, les feuilles lui tombent du ciel' },
      { original: 'Cría fama y acuéstate a dormir', fr: 'Crée-toi une réputation et endors-toi tranquille' },
    ],
  },
  AR: {
    utcOffset: -3, capital: [-34.60, -58.38],
    proverbLabel: 'Proverbe argentin',
    proverbs: [
      { original: 'No hay mal que por bien no venga', fr: 'À quelque chose malheur est bon' },
      { original: 'Al que madruga, Dios lo ayuda', fr: 'Dieu aide celui qui se lève tôt' },
      { original: 'Más vale pájaro en mano que cien volando', fr: 'Mieux vaut un oiseau en main que cent en vol' },
      { original: 'El que no llora, no mama', fr: 'Celui qui ne pleure pas ne tète pas' },
      { original: 'Dime con quién andás y te diré quién sos', fr: 'Dis-moi qui tu fréquentes, je te dirai qui tu es' },
      { original: 'Yerba mala nunca muere', fr: 'La mauvaise herbe ne meurt jamais' },
      { original: 'A caballo regalado no se le miran los dientes', fr: 'À cheval donné, on ne regarde pas les dents' },
      { original: 'El vivo vive del zonzo', fr: 'Le malin vit aux dépens du naïf' },
    ],
  },
  BR: {
    utcOffset: -3, capital: [-15.78, -47.93],
    proverbLabel: 'Proverbe brésilien',
    proverbs: [
      { original: 'Quem não tem cão, caça com gato', fr: 'Qui n\'a pas de chien chasse avec un chat' },
      { original: 'Água mole em pedra dura, tanto bate até que fura', fr: 'L\'eau douce sur la pierre dure finit par la percer' },
      { original: 'De grão em grão, a galinha enche o papo', fr: 'Grain par grain, la poule remplit son jabot' },
      { original: 'Quem com ferro fere, com ferro será ferido', fr: 'Qui blesse par le fer sera blessé par le fer' },
      { original: 'Deus ajuda quem cedo madruga', fr: 'Dieu aide celui qui se lève tôt' },
      { original: 'Em terra de cego, quem tem um olho é rei', fr: 'Au pays des aveugles, le borgne est roi' },
      { original: 'A pressa é inimiga da perfeição', fr: 'La hâte est l\'ennemie de la perfection' },
      { original: 'Nem tudo que reluz é ouro', fr: 'Tout ce qui brille n\'est pas or' },
    ],
  },
  CL: {
    utcOffset: -4, capital: [-33.45, -70.67],
    proverbLabel: 'Proverbe chilien',
    proverbs: [
      { original: 'El que mucho abarca, poco aprieta', fr: 'Qui trop embrasse, mal étreint' },
      { original: 'Más vale tarde que nunca', fr: 'Mieux vaut tard que jamais' },
      { original: 'No por mucho madrugar amanece más temprano', fr: 'Se lever tôt ne fait pas lever le soleil plus vite' },
      { original: 'Donde manda capitán, no manda marinero', fr: 'Là où commande le capitaine, le marin obéit' },
      { original: 'A buen entendedor, pocas palabras bastan', fr: 'À bon entendeur, peu de mots suffisent' },
      { original: 'El que la sigue, la consigue', fr: 'Qui persévère, réussit' },
      { original: 'Más sabe el diablo por viejo que por diablo', fr: 'Le diable en sait plus par son âge que par sa nature' },
      { original: 'Camarón que se duerme se lo lleva la corriente', fr: 'La crevette qui s\'endort est emportée par le courant' },
    ],
  },
  BO: {
    utcOffset: -4, capital: [-16.50, -68.15],
    proverbLabel: 'Proverbe bolivien',
    proverbs: [
      { original: 'No hay que buscar tres pies al gato', fr: 'Il ne faut pas chercher trois pattes au chat' },
      { original: 'Ama suwa, ama llulla, ama qella', fr: 'Ne vole pas, ne mens pas, ne sois pas paresseux' },
      { original: 'Al que madruga, Dios le ayuda', fr: 'Dieu aide celui qui se lève tôt' },
      { original: 'El que no trabaja, no come', fr: 'Celui qui ne travaille pas ne mange pas' },
      { original: 'Más vale poco y bueno que mucho y malo', fr: 'Mieux vaut peu et bon que beaucoup et mauvais' },
      { original: 'Perro que ladra, no muerde', fr: 'Chien qui aboie ne mord pas' },
      { original: 'En boca cerrada no entran moscas', fr: 'Bouche fermée, les mouches n\'entrent pas' },
      { original: 'La montaña enseña paciencia', fr: 'La montagne enseigne la patience' },
    ],
  },
  EC: {
    utcOffset: -5, capital: [-0.18, -78.47],
    proverbLabel: 'Proverbe équatorien',
    proverbs: [
      { original: 'Más vale pájaro en mano que cien volando', fr: 'Mieux vaut un oiseau en main que cent en vol' },
      { original: 'El que siembra, cosecha', fr: 'Celui qui sème, récolte' },
      { original: 'No hay mal que dure cien años', fr: 'Il n\'y a pas de mal qui dure cent ans' },
      { original: 'Dime con quién andas y te diré quién eres', fr: 'Dis-moi qui tu fréquentes, je te dirai qui tu es' },
      { original: 'A mal tiempo, buena cara', fr: 'Au mauvais temps, bon visage' },
      { original: 'Más vale maña que fuerza', fr: 'Mieux vaut l\'adresse que la force' },
      { original: 'El que mucho habla, poco acierta', fr: 'Qui parle trop se trompe souvent' },
      { original: 'Agua que no has de beber, déjala correr', fr: 'L\'eau que tu ne dois pas boire, laisse-la couler' },
    ],
  },
}

const DEFAULT_DATA: CountryLocalData = {
  utcOffset: 0,
  capital: [0, 0],
  proverbs: [
    { original: 'Le voyage est la seule chose que l\'on achète qui rend plus riche', fr: 'Le voyage est la seule chose que l\'on achète qui rend plus riche' },
  ],
  proverbLabel: 'Proverbe du voyageur',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LocalInfoBar({ countryCode, officeCity, officeLat, officeLng }: LocalInfoBarProps) {
  const data = countryCode ? COUNTRY_DATA[countryCode.toUpperCase()] ?? DEFAULT_DATA : DEFAULT_DATA
  const [localTime, setLocalTime] = useState<string>('')
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null)

  // Pick a proverb based on the day of month (deterministic for hydration)
  const proverbIndex = data.proverbs.length > 0 ? new Date().getDate() % data.proverbs.length : 0
  const proverb = data.proverbs[proverbIndex] as Proverb | undefined

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
      const localMs = utcMs + data.utcOffset * 3600000
      const local = new Date(localMs)
      setLocalTime(
        local.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [data.utcOffset])

  // Weather — Open-Meteo (free, no API key)
  // Priority: tenant office coords > country capital fallback
  useEffect(() => {
    let lat: number | undefined
    let lon: number | undefined

    if (officeLat != null && officeLng != null) {
      lat = officeLat
      lon = officeLng
    } else if (data.capital[0] !== 0 || data.capital[1] !== 0) {
      ;[lat, lon] = data.capital
    }

    if (lat == null || lon == null) return

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json?.current) {
          setWeather({ temp: Math.round(json.current.temperature_2m), code: json.current.weather_code })
        }
      })
      .catch(() => { /* Silent — weather is decorative */ })
  }, [data.capital, officeLat, officeLng])

  const utcLabel = data.utcOffset >= 0 ? `UTC+${data.utcOffset}` : `UTC${data.utcOffset}`

  return (
    <div className="bg-white border-b border-gray-200 px-8 lg:px-10 py-3.5">
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Info items */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Local time */}
          {localTime && (
            <div className="flex items-center gap-2 text-[13px]">
              <Clock size={18} weight="duotone" className="text-gray-500" />
              <span className="font-semibold text-gray-800">{localTime}</span>
              <span className="text-gray-500">({utcLabel})</span>
            </div>
          )}

          {/* Weather */}
          {weather && (
            <div className="flex items-center gap-2 text-[13px]">
              <WeatherIcon code={weather.code} size={18} className="text-gray-500" />
              <span className="font-semibold text-gray-800">{weather.temp}°C</span>
              {officeCity && (
                <span className="text-gray-400 text-xs">({officeCity})</span>
              )}
            </div>
          )}
        </div>

        {/* Proverb */}
        {proverb && (
          <div className="flex items-center gap-2 text-[13px] italic text-gray-500">
            <span>&#127802;</span>
            <span>« {proverb.original} » — {proverb.fr} · <span className="not-italic">{data.proverbLabel}</span></span>
          </div>
        )}
      </div>
    </div>
  )
}
