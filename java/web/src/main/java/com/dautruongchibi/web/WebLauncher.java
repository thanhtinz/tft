package com.dautruongchibi.web;

import com.github.xpenatan.gdx.backends.teavm.TeaApplication;
import com.github.xpenatan.gdx.backends.teavm.TeaApplicationConfiguration;
import com.dautruongchibi.ui.MainGame;

// Diem vao cua ban web (TeaVM): class nay duoc TeaVM bien dich sang JavaScript,
// chay trong trinh duyet tren the <canvas id="canvas">. Xem BuildWeb de biet cach build.
public class WebLauncher {
    public static void main(String[] args) {
        TeaApplicationConfiguration config = new TeaApplicationConfiguration("canvas");
        config.width = 1280;
        config.height = 720;
        config.preloadAssets = true;
        new TeaApplication(new MainGame(), config);
    }
}
