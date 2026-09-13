const fileRegex = /\.(ts)$/

export default function hmrPlugin() {
  return {
    name: 'inject-hmr',
    transform: {
      filter: {
        id: fileRegex,
      },
      handler(src: string, _id: string) {
        src += `
          if (import.meta.hot) {
            import.meta.hot.accept((newModule) => {
              if (newModule) {
                globalThis.__onLiveSync(newModule);
              }
            });
          }
        `;
        return {
          code: src,
          map: null
        }
      },
    },
  }
}