use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::{process::CommandChild, ShellExt};

/// Handle del proceso del motor (sidecar), para poder matarlo al cerrar la app.
struct EngineProcess(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .manage(EngineProcess(Mutex::new(None)))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      // Se lanza tanto en `tauri dev` como en el build empaquetado. El flujo con
      // solo Vite (`pnpm dev`, sin ventana nativa) no pasa por acá.
      let (_events, child) = app.shell().sidecar("ultrathing-engine")?.spawn()?;
      *app.state::<EngineProcess>().0.lock().unwrap() = Some(child);
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
