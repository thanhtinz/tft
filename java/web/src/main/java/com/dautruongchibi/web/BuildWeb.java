package com.dautruongchibi.web;

import org.teavm.tooling.TeaVMTargetType;
import org.teavm.tooling.TeaVMTool;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.stream.Stream;

// Chay tren JVM (qua task :web:buildWeb): bien dich WebLauncher + core sang JavaScript bang TeaVM,
// chep assets va sinh index.html vao thu muc dich (web/build/webapp).
public class BuildWeb {
    public static void main(String[] args) throws Exception {
        File outDir = new File(args[0]);
        outDir.mkdirs();

        TeaVMTool tool = new TeaVMTool();
        tool.setTargetDirectory(outDir);
        tool.setTargetFileName("game.js");
        tool.setMainClass("com.dautruongchibi.web.WebLauncher");
        tool.setTargetType(TeaVMTargetType.JAVASCRIPT);
        tool.setOptimizationLevel(org.teavm.vm.TeaVMOptimizationLevel.SIMPLE);
        tool.setLog(new org.teavm.tooling.TeaVMToolLog() {
            @Override public void info(String text) { System.out.println("[TeaVM-info] " + text); }
            @Override public void debug(String text) { System.out.println("[TeaVM-debug] " + text); }
            @Override public void warning(String text) { System.out.println("[TeaVM-warn] " + text); }
            @Override public void error(String text) { System.out.println("[TeaVM-error] " + text); }
            @Override public void info(String text, Throwable e) { System.out.println("[TeaVM-info] " + text); e.printStackTrace(System.out); }
            @Override public void debug(String text, Throwable e) { System.out.println("[TeaVM-debug] " + text); e.printStackTrace(System.out); }
            @Override public void warning(String text, Throwable e) { System.out.println("[TeaVM-warn] " + text); e.printStackTrace(System.out); }
            @Override public void error(String text, Throwable e) { System.out.println("[TeaVM-error] " + text); e.printStackTrace(System.out); }
        });
        // Classloader tu java.class.path cua JVM dang chay (Gradle JavaExec truyen runtime classpath)
        try {
            String[] parts = System.getProperty("java.class.path").split(java.io.File.pathSeparator);
            java.net.URL[] urls = new java.net.URL[parts.length];
            for (int i = 0; i < parts.length; i++) urls[i] = new File(parts[i]).toURI().toURL();
            tool.setClassLoader(new java.net.URLClassLoader(urls, BuildWeb.class.getClassLoader()));
            System.out.println("[BuildWeb] classpath entries: " + parts.length);
        } catch (Exception e) { System.out.println("[BuildWeb] khong set duoc classloader: " + e); }
        tool.generate(); // TeaVM 0.12: generate() tra void, chi tiet loi nam trong ProblemProvider
        for (org.teavm.diagnostics.Problem p : tool.getProblemProvider().getProblems()) {
            Object loc = p.getLocation();
            String locStr = String.valueOf(loc);
            if (loc instanceof org.teavm.model.CallLocation) {
                org.teavm.model.CallLocation cl = (org.teavm.model.CallLocation) loc;
                locStr = "caller=" + cl.getMethod().getClassName() + "." + cl.getMethod().getName()
                    + " src=" + String.valueOf(cl.getSourceLocation());
            }
            System.out.println("[TeaVM-problem] " + p.getSeverity() + ": " + p.getText()
                + " params=" + java.util.Arrays.toString(p.getParams())
                + " @ " + locStr);
        }
        File gameJs = new File(outDir, "game.js");
        if (!gameJs.isFile() || gameJs.length() < 10000) throw new IllegalStateException("TeaVM khong sinh duoc game.js hop le — xem log [TeaVM] o tren.");
        System.out.println("TEAVM_JS_OK game.js = " + gameJs.length() + " bytes");

        // Chep assets (sprite/scene/font) vao webapp/assets de TeaFiles doc qua HTTP
        Path assetsSrc = Path.of("assets");
        Path assetsDst = outDir.toPath().resolve("assets");
        try (Stream<Path> walk = Files.walk(assetsSrc)) {
            for (Path p : (Iterable<Path>) walk::iterator) {
                Path rel = assetsSrc.relativize(p);
                Path dst = assetsDst.resolve(rel.toString());
                if (Files.isDirectory(p)) Files.createDirectories(dst);
                else Files.copy(p, dst, StandardCopyOption.REPLACE_EXISTING);
            }
        }
        // Danh sach tai nguyen cho bo tien tai (asset-loader cua backend doc assets.txt neu co)
        StringBuilder listing = new StringBuilder();
        try (Stream<Path> walk = Files.walk(assetsDst)) {
            walk.filter(Files::isRegularFile)
                .forEach(p -> listing.append("assets/").append(assetsDst.relativize(p).toString().replace('\\', '/')).append('\n'));
        }
        Files.writeString(outDir.toPath().resolve("assets.txt"), listing.toString(), StandardCharsets.UTF_8);

        String html = "<!DOCTYPE html>\n<html lang=\"vi\">\n<head>\n<meta charset=\"utf-8\">\n"
            + "<title>Đấu Trường Chibi — Bản Java Pixel (Web/TeaVM)</title>\n"
            + "<style>html,body{margin:0;background:#0b0714;height:100%}canvas{display:block;margin:0 auto}</style>\n"
            + "</head>\n<body>\n<canvas id=\"canvas\" width=\"1280\" height=\"720\"></canvas>\n"
            + "<script src=\"game.js\"></script>\n<script>main();</script>\n</body>\n</html>\n";
        Files.writeString(outDir.toPath().resolve("index.html"), html, StandardCharsets.UTF_8);
        System.out.println("WEBAPP_DONE " + outDir.getAbsolutePath());
    }
}
