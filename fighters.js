// Point Fighter roster: stats, looks and fighting stances. Loaded before game.js.
// Ratings run 1-99. heightM is in metres.
// look: skin, hair, facial (none/stubble/beard), top (tshirt/tank/rashguard), topColor, pants, stripe, build (slim/athletic/heavy)
//       an empty topColor or stripe means "use the corner colour". Headgear, gloves and foot pads take the pants colour.
// stance: the fighter's own fighting stance (from the stance editor); missing keys use the default stance.
// finisher: the fighter's finisher move, if he has one ('jsbk' = jump spinning back kick, 'sweep' = foot sweep); finPose: its poses from the pose editor.
window.PF_FIGHTERS=[
  {name:'KONSTANTINOS CHOZOS',height:'1.85 m',heightM:1.85,flex:99,kickSpd:90,punchSpd:80,moveSpd:80,cardio:92,finisher:'jsbk',look:{skin:'#e6b48e',hair:'#0f0b09',facial:'none',top:'rashguard',topColor:'#46034f',pants:'#f2f2f2',stripe:'#4c0156',build:'athletic'},stance:{hip:[0,-56],hw:5,sh:[-4,-101],sw:13,hd:[0,-119],fk:[34,-28],ff:[46,0],ffa:0,ffl:12,bk:[-32,-28],bf:[-44,0],bfa:0,bfl:7,le:[29,-82],lf:[45,-91],re:[-31,-75],rf:[-23,-60]},main:'#1e8cff',dark:'#0b4fa8'},
  {name:'MURPHY BAILY',height:'1.77 m',heightM:1.77,flex:80,kickSpd:70,punchSpd:99,moveSpd:90,cardio:95,look:{skin:'#5f3b27',hair:'#0f0b09',facial:'beard',top:'tank',topColor:'#300245',pants:'#35035e',stripe:'#cbd53f',build:'athletic'},stance:{hip:[1,-48],hw:6,sh:[2,-99],sw:13,hd:[5,-117],fk:[34,-28],ff:[46,0],ffa:0,ffl:12,bk:[-32,-28],bf:[-44,0],bfa:0,bfl:7,le:[29,-85],lf:[43,-100],re:[-21,-70],rf:[5,-68]},main:'#e8392c',dark:'#9c1d14'},
  {name:'MILTIADIS LIDORIKIS',height:'1.80 m',heightM:1.80,flex:60,kickSpd:77,punchSpd:80,moveSpd:78,cardio:80,finisher:'sweep',main:'#2aa86a',dark:'#16643e'}
];
