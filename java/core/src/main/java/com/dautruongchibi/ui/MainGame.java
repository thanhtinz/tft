package com.dautruongchibi.ui;

import com.badlogic.gdx.Game;
import com.dautruongchibi.game.Profile;

// Diem vao cua game (LibGDX). Man hinh that duoc nap trong MenuScreen/MatchScreen.
public class MainGame extends Game {
    public Assets assets;
    public Profile profile;

    @Override
    public void create() {
        assets = new Assets();
        assets.load();
        profile = Profile.load(Profile.defaultPath());
        setScreen(new MenuScreen(this));
    }

    public void saveProfile() {
        if (profile != null) profile.save(Profile.defaultPath());
    }

    @Override
    public void dispose() {
        saveProfile();
        if (assets != null) assets.dispose();
        super.dispose();
    }
}
