package com.dautruongchibi.ui;

import com.badlogic.gdx.Game;
import com.dautruongchibi.game.Profile;

// Diem vao cua game (LibGDX). Man hinh that duoc nap trong MenuScreen/MatchScreen.
public class MainGame extends Game {
    public Assets assets;
    public Profile profile;
    public Sound sound;

    @Override
    public void create() {
        assets = new Assets();
        assets.load();
        sound = new Sound();
        profile = Profile.load(Profile.defaultPath());
        setScreen(new MenuScreen(this));
    }

    // Truy cap am thanh an toan cho moi diem vao (ke ca cong cu chup anh dung duong khoi tao rieng)
    public Sound sound() {
        if (sound == null) sound = new Sound();
        return sound;
    }

    public void saveProfile() {
        if (profile != null) profile.save(Profile.defaultPath());
    }

    @Override
    public void dispose() {
        saveProfile();
        if (sound != null) { sound.stopBgm(); sound.dispose(); }
        if (assets != null) assets.dispose();
        super.dispose();
    }
}
