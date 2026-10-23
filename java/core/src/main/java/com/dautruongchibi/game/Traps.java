package com.dautruongchibi.game;

import java.util.Arrays;
import java.util.List;

// Bai bay UP (muon tu Yu-Gi-Oh, ban NHE theo quyet dinh cua user):
// Moi vong o pha chuan bi, nguoi choi xem 3 la ngau nhien va dat up toi da 2 la.
// La bay chi kich hoat 1 lan/vong khi dung dieu kien trong giao tranh, lat mo kem
// banner "BAY KICH HOAT". Engine xu ly tat dinh theo seed nhu ban RN.
public final class Traps {
    private Traps() {}

    public static final class TrapDef {
        public final String id, name, desc, tag;
        public TrapDef(String id, String name, String tag, String desc) { this.id = id; this.name = name; this.tag = tag; this.desc = desc; }
    }

    public static final String HO_SAP = "ho_sap";
    public static final String BANG_GIA = "bang_gia";
    public static final String KHIEN_DOI = "khien_doi";
    public static final String SET_TRUNG_PHAT = "set_trung_phat";
    public static final String HOI_SINH = "hoi_sinh";
    public static final String GUONG_PHAN_DON = "guong_phan_don";

    public static final List<TrapDef> ALL = Arrays.asList(
        new TrapDef(HO_SAP, "Hố Sập Choáng", "CHOÁNG", "Khi mở trận: tướng địch khỏe nhất bị choáng 2.5 giây và nhận 100 sát thương phép."),
        new TrapDef(BANG_GIA, "Bẫy Băng Giá", "BĂNG", "Lần đầu địch tung kỹ năng: đóng băng kẻ đó 2 giây và gây 120 sát thương phép."),
        new TrapDef(KHIEN_DOI, "Khiên Đội Hình", "KHIÊN", "Lần đầu tổng máu đội dưới 50%: toàn đội nhận khiên bằng 15% máu tối đa."),
        new TrapDef(SET_TRUNG_PHAT, "Sét Trừng Phạt", "SÉT", "Ở giây 10, nếu còn từ 3 địch trở lên: sét đánh 180 sát thương phép lên toàn bộ địch."),
        new TrapDef(HOI_SINH, "Hồi Sinh Đồng Đội", "SINH", "Đồng minh đầu tiên gục ngã sẽ hồi sinh với 40% máu."),
        new TrapDef(GUONG_PHAN_DON, "Gương Phản Đòn", "PHẢN", "Đòn chí tử đầu tiên lên đồng minh bị hóa giải (sống sót với 1 máu) và phản 150% sát thương về kẻ đánh.")
    );

    public static TrapDef byId(String id) {
        for (TrapDef t : ALL) if (t.id.equals(id)) return t;
        return null;
    }
    public static String nameOf(String id) {
        TrapDef t = byId(id);
        return t != null ? t.name : id;
    }

    // Trang thai 1 la bay trong 1 tran danh
    public static final class TrapState {
        public final String id;
        public boolean used;
        public TrapState(String id) { this.id = id; }
    }
}
