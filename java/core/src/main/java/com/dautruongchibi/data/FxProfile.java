package com.dautruongchibi.data;

import com.badlogic.gdx.graphics.Color;
import com.dautruongchibi.data.GameData.SkillKind;

import java.util.HashMap;
import java.util.Map;

// Ho so hieu ung (VFX + SFX) theo HE/KY NANG cua tung tuong — dot VFX/SFX theo tuong.
// Truoc dot nay moi tuong tung chieu chi co 1 quang sang vang chung + 1 tieng "cast" chung.
// Nay moi tuong duoc anh xa toi 1 trong 10 ho so: LUA, BANG, SET, DOC, HOI PHUC, KHIEN,
// NANG LUONG (ma thuat), VAT LY, BONG TOI, THIEN NHIEN. Lop render (BattleFx) va lop am
// thanh (Sound.castFor) cung doc bang nay de hieu ung hinh + tieng khop nhau theo he.
//
// Quyet dinh anh xa cac tuong mo ho (ghi lai theo yeu cau):
// - fifi "Lua Ho Ly": SkillKind la poison (sat thuong theo thoi gian) nhung ten/mo ta la
//   LUA dot -> chon LUA (vet chay tren dat thay cho vung doc, cung thoi luong dot).
// - astro "Ho Den Nho": SkillKind freeze, mo ta "dong bang nhom dich" -> chon BANG.
// - baba "Mua Sao Bang": phu thuy bong toi (tom mau tim dam #3c096c) -> chon BONG TOI,
//   sao bang ve nhu cac tia toi roi xuong khu vuc.
// - luna "Ten Trang": execute bang ten anh trang -> NANG LUONG (anh trang bac-tim).
// - king "Uy Nghiêm Cua Vua": buffAS + tu tao khien -> chon KHIEN (tinh nang khien la
//   phan nhin thay ro nhat; tia sang buff van ve theo kind buffAS).
// - sumo "Trieu Hoi Golem Banh" + kingboss "Trieu Hoi Dan Em": summon -> THIEN NHIEN
//   (cong trieu hoi mau dat/la, golem moc len tu mat dat).
// - titan "Dap Dat" + golem quai "Dap Dat": stun vat ly -> VAT LY (vong chan dong dat).
// Quai PvE cung tung chieu trong tran nen cung co ho so (anh xa theo ten ky nang).
public final class FxProfile {
    private FxProfile() {}

    public enum Fx { FIRE, ICE, LIGHTNING, POISON, HEAL, SHIELD, ENERGY, PHYSICAL, SHADOW, NATURE }

    private static final Map<String, Fx> BY_ID = new HashMap<>();
    static {
        // 25 tuong nguoi choi
        BY_ID.put("mimi", Fx.PHYSICAL);   // Vuot Nhanh (dash cao)
        BY_ID.put("bobi", Fx.SHIELD);     // Khien Mat Ong
        BY_ID.put("lulu", Fx.ENERGY);     // Cau Ma Thuat
        BY_ID.put("pipo", Fx.PHYSICAL);   // Mua Ten
        BY_ID.put("toto", Fx.SHIELD);     // Mai Cung
        BY_ID.put("nana", Fx.NATURE);     // Nhay Nhot (buff toc danh)
        BY_ID.put("kiki", Fx.PHYSICAL);   // Gay Xoay
        BY_ID.put("susu", Fx.LIGHTNING);  // Dien Giat
        BY_ID.put("dodo", Fx.HEAL);       // Tieng Hat Hoi Phuc
        BY_ID.put("rero", Fx.ENERGY);     // Tia Laser -> BattleFx ve BEAM rieng theo id
        BY_ID.put("fifi", Fx.FIRE);       // Lua Ho Ly (kind poison = dot chay)
        BY_ID.put("gogo", Fx.PHYSICAL);   // Chem Cong Ly
        BY_ID.put("haha", Fx.ENERGY);     // Bong No
        BY_ID.put("vivi", Fx.HEAL);       // Phan Tien
        BY_ID.put("zaza", Fx.LIGHTNING);  // Sam Lien Hoan -> BattleFx ve set LAN rieng theo id
        BY_ID.put("baba", Fx.SHADOW);     // Mua Sao Bang (phu thuy toi)
        BY_ID.put("king", Fx.SHIELD);     // Uy Nghiem Cua Vua (buff + khien)
        BY_ID.put("queen", Fx.HEAL);      // Keo Ngot
        BY_ID.put("drago", Fx.FIRE);      // Hoi Tho Lua
        BY_ID.put("shadow", Fx.SHADOW);   // Am Sat
        BY_ID.put("astro", Fx.ICE);       // Ho Den Nho (kind freeze)
        BY_ID.put("phoenix", Fx.FIRE);    // Tai Sinh Lua
        BY_ID.put("titan", Fx.PHYSICAL);  // Dap Dat
        BY_ID.put("luna", Fx.ENERGY);     // Ten Trang
        BY_ID.put("sumo", Fx.NATURE);     // Trieu Hoi Golem Banh
        // 10 quai / boss PvE + golem trieu hoi
        BY_ID.put("slime", Fx.PHYSICAL);    // Nay Nay
        BY_ID.put("nam", Fx.POISON);        // Bao Tu Doc
        BY_ID.put("goblin", Fx.PHYSICAL);   // Chem Len
        BY_ID.put("soi", Fx.PHYSICAL);      // Can Manh
        BY_ID.put("golem", Fx.PHYSICAL);    // Dap Dat
        BY_ID.put("skeleton", Fx.PHYSICAL); // Nem Xuong
        BY_ID.put("witchmob", Fx.SHADOW);   // Nguyen Rua
        BY_ID.put("dragonboss", Fx.FIRE);   // Lua Dia Nguc
        BY_ID.put("frostboss", Fx.ICE);     // Bao Tuyet
        BY_ID.put("kingboss", Fx.NATURE);   // Trieu Hoi Dan Em
    }

    // Ho so theo id nghe (art). Id la (khong co trong bang — vd golem summon dung art
    // "golem" da co san) thi roi ve suy theo SkillKind cua ky nang dang tung.
    public static Fx of(String artId, SkillKind kind) {
        if (artId != null) {
            Fx f = BY_ID.get(artId);
            if (f != null) return f;
        }
        return fallback(kind);
    }

    public static Fx fallback(SkillKind kind) {
        if (kind == null) return Fx.ENERGY;
        switch (kind) {
            case heal: return Fx.HEAL;
            case shield: return Fx.SHIELD;
            case buffAS: return Fx.NATURE;
            case summon: return Fx.NATURE;
            case execute: return Fx.SHADOW;
            case poison: return Fx.POISON;
            case freeze: return Fx.ICE;
            case lifesteal: return Fx.SHADOW;
            case dash: case stun: return Fx.PHYSICAL;
            default: return Fx.ENERGY; // burst, aoe
        }
    }

    // Ten file SFX tung chieu theo he: assets/audio/cast_<key>.wav
    // (switch chuoi co dinh, tranh toLowerCase phu thuoc locale/TeaVM)
    public static String sfxKey(Fx f) {
        switch (f) {
            case FIRE: return "fire";
            case ICE: return "ice";
            case LIGHTNING: return "lightning";
            case POISON: return "poison";
            case HEAL: return "heal";
            case SHIELD: return "shield";
            case ENERGY: return "energy";
            case PHYSICAL: return "physical";
            case SHADOW: return "shadow";
            case NATURE: return "nature";
            default: return "energy";
        }
    }

    // Mau chinh (than hieu ung) + mau nhan (tam/vien sang) cua tung he.
    public static Color mainColor(Fx f) {
        switch (f) {
            case FIRE: return new Color(1f, 0.45f, 0.10f, 1);
            case ICE: return new Color(0.45f, 0.85f, 1f, 1);
            case LIGHTNING: return new Color(1f, 0.88f, 0.22f, 1);
            case POISON: return new Color(0.45f, 0.95f, 0.30f, 1);
            case HEAL: return new Color(0.40f, 1f, 0.55f, 1);
            case SHIELD: return new Color(1f, 0.85f, 0.40f, 1);
            case ENERGY: return new Color(0.72f, 0.55f, 1f, 1);
            case PHYSICAL: return new Color(1f, 0.85f, 0.60f, 1);
            case SHADOW: return new Color(0.58f, 0.32f, 0.90f, 1);
            case NATURE: return new Color(0.45f, 0.90f, 0.45f, 1);
            default: return new Color(1, 1, 1, 1);
        }
    }

    public static Color accentColor(Fx f) {
        switch (f) {
            case FIRE: return new Color(1f, 0.82f, 0.30f, 1);
            case ICE: return new Color(0.88f, 0.98f, 1f, 1);
            case LIGHTNING: return new Color(1f, 1f, 0.78f, 1);
            case POISON: return new Color(0.78f, 1f, 0.48f, 1);
            case HEAL: return new Color(0.85f, 1f, 0.88f, 1);
            case SHIELD: return new Color(1f, 0.96f, 0.72f, 1);
            case ENERGY: return new Color(0.92f, 0.82f, 1f, 1);
            case PHYSICAL: return new Color(1f, 1f, 1f, 1);
            case SHADOW: return new Color(0.30f, 0.16f, 0.52f, 1);
            case NATURE: return new Color(0.78f, 1f, 0.62f, 1);
            default: return new Color(1, 1, 1, 1);
        }
    }
}
