/**
 * Settings Management Module
 * Handles appearance settings with URL-based persistence for easy sharing
 */

export interface ThemeOption {
  name: string;
  displayName: string;
  description: string;
}

// Available theme options - these correspond to different CSS files in the styles directory
export const AVAILABLE_THEMES: ThemeOption[] = [
  {
    name: 'default',
    displayName: 'Monochrome Professional',
    description: 'Sophisticated grays with professional appearance',
  },
  {
    name: 'forest-harmony',
    displayName: 'Forest Harmony',
    description: 'Deep forest greens and earth tones',
  },
  {
    name: 'neon-cyber',
    displayName: 'Neon Cyber',
    description: 'Electric blues, purples, and pinks',
  },
  {
    name: 'ocean-breeze',
    displayName: 'Ocean Breeze',
    description: 'Deep ocean blues and teals',
  },
  {
    name: 'original',
    displayName: 'Original Theme',
    description: 'Muted accent colors',
  },
  {
    name: 'sunset-warmth',
    displayName: 'Sunset Warmth',
    description: 'Deep sunset colors with golden accents',
  },
];

export type Theme = 'dark' | 'light';

export interface AppearanceSettings {
  theme: string; // Theme name (corresponds to AVAILABLE_THEMES)
  mode: Theme; // Light or dark mode
}

/**
 * Settings Panel Manager - Handles appearance settings with URL persistence
 */
export class SettingsPanel {
  private panel!: HTMLElement;
  private overlay!: HTMLElement;
  private currentSettings: AppearanceSettings;

  constructor() {
    // Parse initial settings from URL parameters, fallback to system preferences
    this.currentSettings = this.parseSettingsFromURL();
    this.initializePanel();
    this.setupEventListeners();
    // Apply settings immediately to ensure correct initial appearance
    this.applySettings(this.currentSettings);
  }

  /**
   * Parse settings from URL parameters
   */
  private parseSettingsFromURL(): AppearanceSettings {
    const urlParams = new URLSearchParams(window.location.search);
    const theme = urlParams.get('theme') || 'default';
    const mode = (urlParams.get('mode') as Theme) || this.getSystemPreferredMode();

    return { theme, mode };
  }

  /**
   * Get system preferred mode
   */
  private getSystemPreferredMode(): Theme {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * Update URL with current settings
   */
  private updateURL(settings: AppearanceSettings): void {
    const url = new URL(window.location.href);

    // Only add to URL if not default values
    if (settings.theme !== 'default') {
      url.searchParams.set('theme', settings.theme);
    } else {
      url.searchParams.delete('theme');
    }

    if (settings.mode !== 'dark') {
      url.searchParams.set('mode', settings.mode);
    } else {
      url.searchParams.delete('mode');
    }

    // Update URL without page reload
    window.history.replaceState({}, '', url.toString());
  }

  /**
   * Initialize the settings panel
   */
  private initializePanel(): void {
    this.panel = document.getElementById('appearance-panel') as HTMLElement;
    this.overlay = document.getElementById('settings-overlay') as HTMLElement;

    if (!this.panel) {
      throw new Error(
        'Settings panel element (#appearance-panel) not found in DOM. Make sure the HTML includes the settings panel structure.',
      );
    }

    if (!this.overlay) {
      throw new Error(
        'Settings overlay element (#settings-overlay) not found in DOM. Make sure the HTML includes the settings overlay structure.',
      );
    }

    this.populateThemeOptions();
    this.updateSelectedOptions();
  }

  /**
   * Populate theme options in the panel
   */
  private populateThemeOptions(): void {
    const themeGrid = this.panel.querySelector('.theme-grid');
    if (!themeGrid) {
      throw new Error(
        'Theme grid element (.theme-grid) not found in settings panel. Make sure the HTML includes the theme grid structure.',
      );
    }

    themeGrid.innerHTML = AVAILABLE_THEMES.map(
      theme => `
      <div class="theme-option" data-theme="${theme.name}">
        <div class="theme-preview">
          <div class="theme-preview-color" style="background: var(--color-primary)"></div>
          <div class="theme-preview-color" style="background: var(--color-surface)"></div>
          <div class="theme-preview-color" style="background: var(--color-accent)"></div>
        </div>
        <div class="theme-info">
          <h4 class="theme-name">${theme.displayName}</h4>
          <p class="theme-description">${theme.description}</p>
        </div>
      </div>
    `,
    ).join('');
  }

  /**
   * Update selected options in the UI
   */
  private updateSelectedOptions(): void {
    // Update theme selection
    const themeOptions = this.panel.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
      const themeElement = option as HTMLElement;
      if (themeElement.dataset.theme === this.currentSettings.theme) {
        themeElement.classList.add('selected');
      } else {
        themeElement.classList.remove('selected');
      }
    });

    // Update mode selection
    const modeRadios = this.panel.querySelectorAll('.mode-radio') as NodeListOf<HTMLInputElement>;
    modeRadios.forEach(radio => {
      radio.checked = radio.value === this.currentSettings.mode;
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Settings button
    const settingsButton = document.querySelector('.appearance-settings');
    settingsButton?.addEventListener('click', () => this.open());

    // Close button and overlay
    const closeButton = this.panel.querySelector('.settings-close');
    closeButton?.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', () => this.close());

    // Theme options
    const themeOptions = this.panel.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
      option.addEventListener('click', e => {
        const themeElement = e.currentTarget as HTMLElement;
        const theme = themeElement.dataset.theme;
        if (theme) {
          this.updateSettings({ ...this.currentSettings, theme });
        }
      });
    });

    // Mode radios
    const modeRadios = this.panel.querySelectorAll('.mode-radio') as NodeListOf<HTMLInputElement>;
    modeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.updateSettings({ ...this.currentSettings, mode: radio.value as Theme });
        }
      });
    });

    // Keyboard navigation
    this.panel.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  /**
   * Update settings
   */
  private updateSettings(newSettings: AppearanceSettings): void {
    this.currentSettings = newSettings;
    this.applySettings(newSettings);
    this.updateURL(newSettings);
    this.updateSelectedOptions();
  }

  /**
   * Apply settings to the document
   */
  private applySettings(settings: AppearanceSettings): void {
    this.applyTheme(settings.theme);
    this.applyMode(settings.mode);
  }

  /**
   * Apply theme class to body
   */
  private applyTheme(themeName: string): void {
    const theme = AVAILABLE_THEMES.find(t => t.name === themeName);
    if (!theme) {
      console.warn(`Theme ${themeName} not found, using default`);
      return;
    }

    const body = document.body;

    // Remove existing theme classes
    AVAILABLE_THEMES.forEach(t => {
      body.classList.remove(`theme-${t.name}`);
    });

    // Add the new theme class
    body.classList.add(`theme-${themeName}`);
  }

  /**
   * Apply dark/light mode
   */
  private applyMode(mode: Theme): void {
    const body = document.body;

    // Remove existing theme classes
    body.classList.remove('light-theme', 'dark-theme');

    // Add the appropriate theme class
    body.classList.add(`${mode}-theme`);
  }

  /**
   * Open the settings panel
   */
  public open(): void {
    this.panel.classList.add('active');
    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus the panel for accessibility
    this.panel.focus();
  }

  /**
   * Close the settings panel
   */
  public close(): void {
    this.panel.classList.remove('active');
    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Get current settings
   */
  public getCurrentSettings(): AppearanceSettings {
    return { ...this.currentSettings };
  }
}
