// Du lieu game thuan - Dau Truong Chibi
export type SkillKind = 'burst'|'aoe'|'stun'|'heal'|'shield'|'buffAS'|'summon'|'execute'|'poison'|'freeze'|'lifesteal'|'dash';
export interface SkillDef { name: string; kind: SkillKind; power: number; desc: string; }
export interface ChampDef { id: string; name: string; cost: number; traits: [string, string]; hp: number; ad: number; armor: number; mr: number; as: number; range: number; mana: number; color: string; hair: string; accessory: string; weapon: string; skill: SkillDef; }
export interface TraitDef { id: string; name: string; thresholds: number[]; desc: string; }
export interface ItemDef { id: string; name: string; desc: string; hp?: number; ad?: number; ap?: number; armor?: number; mr?: number; asPct?: number; crit?: number; mana?: number; lifesteal?: number; color: string; }
export interface AugmentDef { id: string; name: string; desc: string; kind: string; value: number; }
export const TRAITS: TraitDef[] = [
  { id: 'hiepsi', name: 'Hiệp Sĩ', thresholds: [2, 4], desc: 'Tăng giáp và máu.' },
  { id: 'phuthuy', name: 'Phù Thủy', thresholds: [2, 4], desc: 'Tăng sức mạnh kỹ năng.' },
  { id: 'xathu', name: 'Xạ Thủ', thresholds: [2, 4], desc: 'Tăng tốc đánh.' },
  { id: 'satthu', name: 'Sát Thủ', thresholds: [2, 4], desc: 'Tăng chí mạng.' },
  { id: 'hove', name: 'Hộ Vệ', thresholds: [2, 4], desc: 'Nhận khiên đầu trận, tăng máu.' },
  { id: 'nguyento', name: 'Nguyên Tố', thresholds: [2, 3], desc: 'Hồi mana nhanh hơn.' },
  { id: 'tinhlinh', name: 'Tinh Linh', thresholds: [2, 4], desc: 'Tăng né tránh và hồi máu.' },
  { id: 'longtoc', name: 'Long Tộc', thresholds: [2, 3], desc: 'Tăng mọi chỉ số.' },
];
export const traitName = (id: string) => TRAITS.find(t => t.id === id)?.name ?? id;
const S = (name: string, kind: SkillKind, power: number, desc: string): SkillDef => ({ name, kind, power, desc });
export const CHAMPIONS: ChampDef[] = [
  { id:'mimi', name:'Mimi Mèo', cost:1, traits:['tinhlinh','satthu'], hp:550, ad:55, armor:20, mr:20, as:0.75, range:1, mana:50, color:'#ffb3c8', hair:'#ff8fab', accessory:'tai-meo', weapon:'mong-vuot', skill:S('Vuốt Nhanh','dash',160,'Lao tới cào kẻ địch yếu máu nhất.') },
  { id:'bobi', name:'Bobi Gấu', cost:1, traits:['hove','hiepsi'], hp:700, ad:50, armor:35, mr:25, as:0.6, range:1, mana:60, color:'#ffd6a5', hair:'#c98a4b', accessory:'tai-gau', weapon:'khien', skill:S('Khiên Mật Ong','shield',220,'Tạo khiên cho bản thân và đồng minh gần nhất.') },
  { id:'lulu', name:'Lulu Phù Thủy', cost:1, traits:['phuthuy','nguyento'], hp:500, ad:45, armor:15, mr:30, as:0.7, range:3, mana:60, color:'#cdb4f6', hair:'#7b5ea7', accessory:'mu-phuthuy', weapon:'gay-phep', skill:S('Cầu Ma Thuật','burst',200,'Bắn cầu ma thuật gây sát thương lớn đơn thể.') },
  { id:'pipo', name:'Pipo Chim Sẻ', cost:1, traits:['xathu','tinhlinh'], hp:480, ad:60, armor:15, mr:15, as:0.85, range:4, mana:70, color:'#a2d2ff', hair:'#3a86ff', accessory:'canh', weapon:'cung', skill:S('Mưa Tên','aoe',130,'Bắn mưa tên lên nhóm địch.') },
  { id:'toto', name:'Toto Rùa', cost:1, traits:['hove','nguyento'], hp:750, ad:45, armor:40, mr:30, as:0.55, range:1, mana:80, color:'#b9fbc0', hair:'#2a9d8f', accessory:'mai-rua', weapon:'khien', skill:S('Mai Cứng','shield',260,'Nhận khiên dày và hồi máu.') },
  { id:'nana', name:'Nana Thỏ', cost:2, traits:['tinhlinh','xathu'], hp:520, ad:65, armor:18, mr:18, as:0.9, range:3, mana:60, color:'#ffc8dd', hair:'#ff70a6', accessory:'tai-tho', weapon:'carot', skill:S('Nhảy Nhót','buffAS',35,'Tăng tốc đánh cho toàn đội trong 5 giây.') },
  { id:'kiki', name:'Kiki Khỉ', cost:2, traits:['satthu','hiepsi'], hp:600, ad:70, armor:22, mr:20, as:0.8, range:1, mana:50, color:'#ffcfd2', hair:'#9d4edd', accessory:'duoi', weapon:'gay', skill:S('Gậy Xoay','aoe',150,'Xoay gậy gây sát thương quanh mình.') },
  { id:'susu', name:'Susu Sứa', cost:2, traits:['nguyento','phuthuy'], hp:540, ad:50, armor:16, mr:32, as:0.7, range:3, mana:55, color:'#90e0ef', hair:'#00b4d8', accessory:'xuc-tu', weapon:'bong-bong', skill:S('Điện Giật','stun',150,'Gây sát thương và làm choáng 1.5 giây.') },
  { id:'dodo', name:'Dodo Vịt', cost:2, traits:['hove','tinhlinh'], hp:650, ad:55, armor:28, mr:28, as:0.65, range:2, mana:70, color:'#fdffb6', hair:'#ffd60a', accessory:'mo-vit', weapon:'loa', skill:S('Tiếng Hát Hồi Phục','heal',220,'Hồi máu cho đồng minh yếu nhất.') },
  { id:'rero', name:'Rero Robot', cost:2, traits:['hiepsi','nguyento'], hp:680, ad:58, armor:38, mr:22, as:0.65, range:1, mana:75, color:'#dee2e6', hair:'#6c757d', accessory:'angten', weapon:'bung-nang-luong', skill:S('Tia Laser','burst',230,'Bắn laser xuyên mục tiêu.') },
  { id:'fifi', name:'Fifi Cáo', cost:3, traits:['satthu','phuthuy'], hp:580, ad:68, armor:20, mr:24, as:0.85, range:2, mana:45, color:'#ffadad', hair:'#e85d04', accessory:'tai-cao', weapon:'quat', skill:S('Lửa Hồ Ly','poison',60,'Đốt địch, gây sát thương theo thời gian.') },
  { id:'gogo', name:'Gogo Hiệp Sĩ', cost:3, traits:['hiepsi','hove'], hp:850, ad:65, armor:45, mr:35, as:0.6, range:1, mana:80, color:'#a9d6e5', hair:'#4361ee', accessory:'mu-sat', weapon:'kiem', skill:S('Chém Công Lý','stun',180,'Chém mạnh và làm choáng mục tiêu.') },
  { id:'haha', name:'Haha Hề', cost:3, traits:['phuthuy','satthu'], hp:560, ad:60, armor:18, mr:26, as:0.8, range:3, mana:60, color:'#e0aaff', hair:'#5a189a', accessory:'mu-he', weapon:'bong', skill:S('Bóng Nổ','aoe',190,'Ném bóng nổ diện rộng.') },
  { id:'vivi', name:'Vivi Tiên', cost:3, traits:['tinhlinh','phuthuy'], hp:530, ad:52, armor:16, mr:30, as:0.75, range:3, mana:65, color:'#caffbf', hair:'#38b000', accessory:'canh-tien', weapon:'dua-than', skill:S('Phấn Tiên','heal',280,'Hồi máu cho 2 đồng minh yếu nhất.') },
  { id:'zaza', name:'Zaza Sấm', cost:3, traits:['xathu','nguyento'], hp:570, ad:75, armor:18, mr:20, as:0.95, range:4, mana:55, color:'#fff3b0', hair:'#f77f00', accessory:'tia-set', weapon:'sung-set', skill:S('Sấm Liên Hoàn','burst',240,'Bắn tia sét nhảy qua 3 mục tiêu.') },
  { id:'baba', name:'Bà Ba Phù Thủy', cost:4, traits:['phuthuy','longtoc'], hp:620, ad:55, armor:20, mr:35, as:0.7, range:3, mana:70, color:'#bdb2ff', hair:'#3c096c', accessory:'mu-phuthuy', weapon:'sach', skill:S('Mưa Sao Băng','aoe',280,'Triệu hồi mưa sao băng diện rộng lớn.') },
  { id:'king', name:'Vua Bánh King', cost:4, traits:['hiepsi','longtoc'], hp:950, ad:75, armor:50, mr:40, as:0.62, range:1, mana:90, color:'#ffe5b4', hair:'#bc6c25', accessory:'vuong-mien', weapon:'kiem-vang', skill:S('Uy Nghiêm Của Vua','buffAS',45,'Buff toàn đội và tạo khiên cho bản thân.') },
  { id:'queen', name:'Nữ Hoàng Kẹo', cost:4, traits:['hove','longtoc'], hp:700, ad:60, armor:30, mr:38, as:0.7, range:3, mana:75, color:'#ffc6ff', hair:'#c9184a', accessory:'vuong-mien', weapon:'gay-keo', skill:S('Kẹo Ngọt','heal',350,'Hồi máu lớn cho toàn đội.') },
  { id:'drago', name:'Drago Rồng Con', cost:4, traits:['longtoc','nguyento'], hp:800, ad:80, armor:35, mr:35, as:0.7, range:2, mana:80, color:'#ff9770', hair:'#d62828', accessory:'sung', weapon:'lua', skill:S('Hơi Thở Lửa','aoe',260,'Phun lửa hình nón diện rộng.') },
  { id:'shadow', name:'Bóng Đêm Pyon', cost:4, traits:['satthu','longtoc'], hp:640, ad:90, armor:22, mr:22, as:0.95, range:1, mana:40, color:'#adb5bd', hair:'#212529', accessory:'khan', weapon:'dao', skill:S('Ám Sát','execute',300,'Kết liễu mục tiêu yếu máu với sát thương cực lớn.') },
  { id:'astro', name:'Phi Hành Gia Mo', cost:5, traits:['nguyento','hiepsi'], hp:900, ad:85, armor:45, mr:45, as:0.7, range:2, mana:100, color:'#caf0f8', hair:'#0077b6', accessory:'mu-vu-tru', weapon:'tia-vu-tru', skill:S('Hố Đen Nhỏ','freeze',280,'Đóng băng nhóm địch 2 giây, sát thương lớn.') },
  { id:'phoenix', name:'Phượng Hoàng Lửa', cost:5, traits:['longtoc','phuthuy'], hp:850, ad:70, armor:30, mr:40, as:0.75, range:3, mana:90, color:'#ffb703', hair:'#fb8500', accessory:'canh-lua', weapon:'lua-phuong', skill:S('Tái Sinh Lửa','lifesteal',320,'Sát thương lớn và hồi máu 60% sát thương.') },
  { id:'titan', name:'Titan Bánh Quy', cost:5, traits:['hove','hiepsi'], hp:1300, ad:80, armor:60, mr:50, as:0.55, range:1, mana:100, color:'#e6ccb2', hair:'#7f5539', accessory:'sung', weapon:'bua', skill:S('Đập Đất','stun',250,'Đập đất gây sát thương và choáng diện rộng 2 giây.') },
  { id:'luna', name:'Luna Công Chúa Trăng', cost:5, traits:['tinhlinh','xathu'], hp:700, ad:95, armor:25, mr:30, as:1.0, range:4, mana:60, color:'#e0c3fc', hair:'#7209b7', accessory:'trang', weapon:'cung-trang', skill:S('Tên Trăng','execute',350,'Bắn tên trăng cực mạnh, mạnh hơn khi địch yếu máu.') },
  { id:'sumo', name:'Sumo Triệu Hồi Sư', cost:5, traits:['hove','phuthuy'], hp:750, ad:60, armor:32, mr:36, as:0.65, range:3, mana:110, color:'#d8f3dc', hair:'#1b4332', accessory:'vong', weapon:'chuong', skill:S('Triệu Hồi Golem Bánh','summon',0,'Triệu hồi Golem Bánh 900 máu chắn phía trước.') },
];
export const champById = (id: string) => CHAMPIONS.find(c => c.id === id)!;
export const ITEMS: ItemDef[] = [
  { id:'kiem', name:'Kiếm Bánh Quy', desc:'+20 sát thương', ad:20, color:'#f4a261' },
  { id:'giap', name:'Giáp Kẹo Cứng', desc:'+25 giáp, +150 máu', armor:25, hp:150, color:'#90e0ef' },
  { id:'nuocmat', name:'Giọt Nước Mắt Sao', desc:'+20 mana, +15 SMKN', mana:20, ap:15, color:'#48cae4' },
  { id:'gay', name:'Gậy Socola', desc:'+30 SMKN', ap:30, color:'#9d6b53' },
  { id:'cung', name:'Cung Kẹo Dẻo', desc:'+25% tốc đánh', asPct:25, color:'#ff8fab' },
  { id:'aochoang', name:'Áo Choàng Đêm', desc:'+25 kháng phép, +200 máu', mr:25, hp:200, color:'#5a189a' },
  { id:'gang', name:'Găng Kim Cương', desc:'+20% chí mạng, +15 SMKN', crit:20, ap:15, color:'#ffd60a' },
  { id:'tim', name:'Trái Tim Ấm', desc:'+400 máu', hp:400, color:'#ef476f' },
  { id:'vuot', name:'Vuốt Rồng', desc:'+20% hút máu, +15 sát thương', lifesteal:20, ad:15, color:'#d62828' },
  { id:'sachcu', name:'Sách Cổ Ma Thuật', desc:'+40 SMKN, +10 mana', ap:40, mana:10, color:'#7b5ea7' },
  { id:'khienvang', name:'Khiên Vàng', desc:'+35 giáp, +35 kháng phép', armor:35, mr:35, color:'#ffb703' },
  { id:'giay', name:'Giày Bay', desc:'+20% tốc đánh', asPct:20, color:'#38b000' },
];
export const itemById = (id: string) => ITEMS.find(i => i.id === id);
export const AUGMENTS: AugmentDef[] = [
  { id:'vang1', name:'Túi Vàng May Mắn', desc:'Nhận ngay 12 vàng.', kind:'gold', value:12 },
  { id:'vang2', name:'Lãi Kép', desc:'Nhận thêm vàng khi thắng round.', kind:'winGold', value:4 },
  { id:'mau1', name:'Trái Tim Đội', desc:'Toàn đội +15% máu tối đa.', kind:'teamHp', value:15 },
  { id:'sat1', name:'Sắc Bén', desc:'Toàn đội +12% sát thương.', kind:'teamAd', value:12 },
  { id:'hoi1', name:'Hồi Phục Nhanh', desc:'Hồi 20 máu người chơi, +2 máu mỗi round.', kind:'healPlayer', value:20 },
  { id:'toc1', name:'Nhanh Như Chớp', desc:'Toàn đội +12% tốc đánh.', kind:'teamAs', value:12 },
  { id:'kinhnghiem', name:'Học Nhanh', desc:'Nhận ngay 12 XP.', kind:'xp', value:12 },
  { id:'giapdoi', name:'Giáp Đội', desc:'Toàn đội +15 giáp và kháng phép.', kind:'teamArmor', value:15 },
];
export interface MonsterDef { id: string; name: string; hp: number; ad: number; armor: number; mr: number; as: number; range: number; mana: number; color: string; hair: string; accessory: string; weapon: string; skill: SkillDef; }
const M = (id:string,name:string,hp:number,ad:number,color:string,acc:string,skill:SkillDef): MonsterDef => ({ id, name, hp, ad, armor:15, mr:15, as:0.7, range:1, mana:60, color, hair:color, accessory:acc, weapon:'mong-vuot', skill });
export const MONSTERS: MonsterDef[] = [
  M('slime','Slime Hồng',350,30,'#ffc8dd','tai-meo',S('Nảy Nảy','burst',80,'Nhảy lên đập mục tiêu.')),
  M('nam','Nấm Độc',420,35,'#b9fbc0','mu-nam',S('Bào Tử Độc','poison',30,'Phun độc theo thời gian.')),
  M('goblin','Goblin Tinh Nghịch',500,45,'#caffbf','tai-goblin',S('Chém Lén','dash',110,'Lao tới chém.')),
  M('soi','Sói Xám Con',600,55,'#dee2e6','tai-soi',S('Cắn Mạnh','burst',140,'Cắn gây sát thương lớn.')),
  M('golem','Golem Đá',1000,50,'#adb5bd','sung-da',S('Đập Đất','stun',120,'Đập đất làm choáng.')),
  M('skeleton','Xương Khô Cười',650,65,'#f8f9fa','mu-xuong',S('Ném Xương','burst',160,'Ném xương từ xa.')),
  M('witchmob','Phù Thủy Rừng',700,60,'#cdb4f6','mu-phuthuy',S('Nguyền Rủa','aoe',150,'Nguyền diện rộng.')),
  M('dragonboss','Rồng Boss Lửa',2200,90,'#ff9770','sung',S('Lửa Địa Ngục','aoe',260,'Phun lửa diện rộng cực mạnh.')),
  M('frostboss','Boss Băng Giá',2600,85,'#90e0ef','vuong-mien',S('Bão Tuyết','freeze',240,'Đóng băng diện rộng.')),
  M('kingboss','Vua Quái Vật',3200,100,'#ffe5b4','vuong-mien',S('Triệu Hồi Đàn Em','summon',0,'Triệu hồi thêm quái nhỏ.')),
];
export const monsterById = (id: string) => MONSTERS.find(m => m.id === id)!;
export interface CampaignStage { id: number; chapter: number; name: string; enemies: { id: string; count: number }[]; reward: number; }
const stage = (id:number,name:string,enemies:{id:string;count:number}[],reward:number): CampaignStage => ({ id, chapter: id<=4?1:id<=8?2:3, name, enemies, reward });
export const CAMPAIGN: CampaignStage[] = [
  stage(1,'Rừng Slime',[{id:'slime',count:2}],30), stage(2,'Đồi Nấm',[{id:'slime',count:2},{id:'nam',count:1}],40),
  stage(3,'Hang Goblin',[{id:'goblin',count:2},{id:'nam',count:1}],50), stage(4,'Boss: Golem Đá',[{id:'golem',count:1},{id:'slime',count:2}],90),
  stage(5,'Bãi Biển Sói',[{id:'soi',count:3}],70), stage(6,'Tháp Xương',[{id:'skeleton',count:3},{id:'goblin',count:1}],80),
  stage(7,'Rừng Phù Thủy',[{id:'witchmob',count:2},{id:'soi',count:2}],95), stage(8,'Boss: Rồng Lửa',[{id:'dragonboss',count:1},{id:'slime',count:2}],140),
  stage(9,'Lâu Đài Băng',[{id:'skeleton',count:3},{id:'witchmob',count:2}],120), stage(10,'Đội Quân Bóng Đêm',[{id:'soi',count:3},{id:'skeleton',count:3}],140),
  stage(11,'Cận Vệ Vua Quái',[{id:'golem',count:2},{id:'witchmob',count:2}],160), stage(12,'Boss Cuối: Vua Quái Vật',[{id:'kingboss',count:1},{id:'dragonboss',count:1}],250),
];
export const LEVEL_XP = [0,2,6,10,20,32,50,72,100000];
export const SHOP_ODDS: Record<number, number[]> = { 1:[100,0,0,0,0],2:[100,0,0,0,0],3:[75,25,0,0,0],4:[55,30,15,0,0],5:[45,33,20,2,0],6:[30,40,25,5,0],7:[19,35,35,10,1],8:[18,28,36,16,2],9:[10,20,35,28,7] };
export const BOT_NAMES = ['Bé Na','Anh Tèo','Chị Mây','Bé Bắp','Ông Kẹo','Chị Sao','Bé Mít'];
