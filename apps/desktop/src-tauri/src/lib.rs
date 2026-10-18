use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
#[cfg(not(debug_assertions))]
use tauri_plugin_shell::ShellExt;

/// Handle del proceso del motor (sidecar), para poder matarlo al cerrar la app.
struct EngineProcess(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Debe ser el primer plugin: en Linux/Windows reenvía el deep link de la
    // segunda instancia a la app que ya está abierta.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .manage(EngineProcess(Mutex::new(None)))
        .setup(|app| {
            // Linux necesita registrar el esquema también en desarrollo y cuando el
            // AppImage no fue integrado por un launcher. Windows lo hace en dev.
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            // Solo en release (app empaquetada) lanzamos el motor como sidecar. En dev el
            // motor se corre a mano (`pnpm engine`) con el código más reciente; lanzar el
            // sidecar aquí competiría por el puerto 8787 con un binario viejo.
            #[cfg(not(debug_assertions))]
            {
                let (_events, child) = app.shell().sidecar("ultrathing-engine")?.spawn()?;
                *app.state::<EngineProcess>().0.lock().unwrap() = Some(child);
            }

            // En Linux (WebKitGTK) el micrófono/cámara están bloqueados por defecto: hay que
            // habilitar el media-stream y aceptar la petición de permiso (getUserMedia del
            // módulo voz). En Windows/macOS el webview usa el permiso del sistema, no hace falta.
            #[cfg(target_os = "linux")]
            {
                use webkit2gtk::{PermissionRequestExt, SettingsExt, WebViewExt};
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.with_webview(|webview| {
                        let wv = webview.inner();
                        if let Some(settings) = WebViewExt::settings(&wv) {
                            settings.set_enable_media_stream(true);
                        }
                        wv.connect_permission_request(|_wv, req| {
                            req.allow();
                            true
                        });
                    });
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(child) = window.state::<EngineProcess>().0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
