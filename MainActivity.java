package com.example.maxsen;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private final static int FILE_CHOOSER_RESULT_CODE = 1;
    private final static int PERMISSIONS_REQUEST_CODE = 100;

    private boolean doubleBackToExitPressedOnce = false;
    private final Handler backHandler = new Handler(Looper.getMainLooper());
    private final Runnable backResetRunnable = new Runnable() {
        @Override
        public void run() {
            doubleBackToExitPressedOnce = false;
        }
    };

    private static final String CHANNEL_ID = "maxsen_messages";
    private static final String CHANNEL_NAME = "الرسائل";
    private int notificationIdCounter = 100;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // شريط شفاف
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setContentView(R.layout.activity_main);
        enableEdgeToEdge();

        webView = findViewById(R.id.webview);
        webView.setBackgroundColor(Color.parseColor("#06060A"));

        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setAllowFileAccess(true);
        ws.setAllowContentAccess(true);
        ws.setAllowFileAccessFromFileURLs(true);
        ws.setAllowUniversalAccessFromFileURLs(true);
        ws.setDatabaseEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        ws.setLoadWithOverviewMode(true);
        ws.setUseWideViewPort(true);
        ws.setJavaScriptCanOpenWindowsAutomatically(true);

        webView.setWebViewClient(new WebViewClient());

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView wv, ValueCallback<Uri[]> cb,
                                             FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = cb;
                Intent intent = params.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                try {
                    startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        request.grant(request.getResources());
                    }
                });
            }
        });

        // Bridge بين JS و Android
        webView.addJavascriptInterface(new WebAppBridge(), "AndroidBridge");

        webView.loadUrl("file:///android_asset/index.html");

        // قناة الإشعارات
        createNotificationChannel();

        // طلب الصلاحيات
        requestAppPermissions();
    }

    // ============================================================
    // طلب الصلاحيات
    // ============================================================
    private void requestAppPermissions() {
        List<String> needed = new ArrayList<>();

        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.RECORD_AUDIO);
        }
        if (checkSelfPermission(Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.CAMERA);
        }

        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission("android.permission.POST_NOTIFICATIONS")
                    != PackageManager.PERMISSION_GRANTED) {
                needed.add("android.permission.POST_NOTIFICATIONS");
            }
            if (checkSelfPermission("android.permission.READ_MEDIA_IMAGES")
                    != PackageManager.PERMISSION_GRANTED) {
                needed.add("android.permission.READ_MEDIA_IMAGES");
            }
            if (checkSelfPermission("android.permission.READ_MEDIA_AUDIO")
                    != PackageManager.PERMISSION_GRANTED) {
                needed.add("android.permission.READ_MEDIA_AUDIO");
            }
        } else {
            if (checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }

        if (!needed.isEmpty()) {
            requestPermissions(needed.toArray(new String[0]), PERMISSIONS_REQUEST_CODE);
        }
    }

    // ============================================================
    // الإشعارات
    // ============================================================
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("إشعارات رسائل MAXSEN");
            channel.enableLights(true);
            channel.setLightColor(Color.parseColor("#4F73FF"));
            channel.enableVibration(true);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private void showNotification(String title, String body, String chatUser) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (chatUser != null) intent.putExtra("openChatWith", chatUser);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, notificationIdCounter, intent, flags);

        android.app.Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new android.app.Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new android.app.Notification.Builder(this);
        }

        builder.setSmallIcon(R.mipmap.ic_launcher)
               .setContentTitle(title)
               .setContentText(body)
               .setAutoCancel(true)
               .setContentIntent(pendingIntent)
               .setDefaults(android.app.Notification.DEFAULT_ALL);

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(notificationIdCounter++, builder.build());
        }
    }

    // ============================================================
    // Bridge (يستدعيه JavaScript)
    // ============================================================
    public class WebAppBridge {
        @JavascriptInterface
        public void showNotification(final String title, final String body, final String chatUser) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    MainActivity.this.showNotification(title, body, chatUser);
                }
            });
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                android.os.Vibrator v = (android.os.Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v != null) v.vibrate(ms);
            } catch (Exception ignored) {}
        }
    }

    // ============================================================
    // Edge-to-Edge
    // ============================================================
    private void enableEdgeToEdge() {
        if (Build.VERSION.SDK_INT >= 30) {
            try {
                getWindow().setDecorFitsSystemWindows(false);
                android.view.WindowInsetsController c = getWindow().getInsetsController();
                if (c != null) {
                    c.setSystemBarsAppearance(0,
                            android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                                    | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
                }
            } catch (Exception ignored) {}
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enableEdgeToEdge();
    }

    @Override
    protected void onResume() {
        super.onResume();
        enableEdgeToEdge();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_RESULT_CODE && filePathCallback != null) {
            filePathCallback.onReceiveValue(
                    WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            filePathCallback = null;
        }
    }

    // ============================================================
    // زر الرجوع الذكي (يستدعي JS أولاً)
    // ============================================================
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView != null) {
                webView.evaluateJavascript(
                    "(function(){ try { return (window.handleBackButton && window.handleBackButton()) || 'exit'; } catch(e){ return 'exit'; } })()",
                    new ValueCallback<String>() {
                        @Override
                        public void onReceiveValue(String value) {
                            String result = (value != null) ? value.replace("\"", "").trim() : "exit";
                            if (!"handled".equals(result)) {
                                if (doubleBackToExitPressedOnce) {
                                    finish();
                                    return;
                                }
                                doubleBackToExitPressedOnce = true;
                                Toast.makeText(MainActivity.this, "اضغط مرة أخرى للخروج", Toast.LENGTH_SHORT).show();
                                backHandler.removeCallbacks(backResetRunnable);
                                backHandler.postDelayed(backResetRunnable, 2000);
                            }
                        }
                    });
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        backHandler.removeCallbacks(backResetRunnable);
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}