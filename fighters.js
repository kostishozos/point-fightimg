// Point Fighter roster: stats, looks and fighting stances. Loaded before game.js.
// Ratings run 1-99. heightM is in metres.
// look: skin, hair, facial (none/stubble/beard), top (tshirt/tank/rashguard), topColor, pants, stripe, build (slim/athletic/heavy)
//       an empty topColor or stripe means "use the corner colour". Headgear, gloves and foot pads are always the corner colour.
// stance: the fighter's own fighting stance (from the stance editor); missing keys use the default stance.
window.PF_FIGHTERS=[
  {name:'KONSTANTINOS CHOZOS',height:'1.85 m',heightM:1.85,flex:99,kickSpd:90,punchSpd:80,moveSpd:80,cardio:92,look:{skin:'#e6b48e',hair:'#0f0b09',facial:'none',top:'tshirt',topColor:'#46034f',pants:'#f2f2f2',stripe:'#4c0156',build:'athletic'},main:'#1e8cff',dark:'#0b4fa8'},
  {name:'MURPHY BAILY',height:'1.77 m',heightM:1.77,flex:80,kickSpd:70,punchSpd:99,moveSpd:90,cardio:95,main:'#e8392c',dark:'#9c1d14'}
];
