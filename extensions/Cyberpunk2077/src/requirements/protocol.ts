export interface SteamPrerequisiteRegistrationCompat {
  id: string
  steamAppId: number
  presentation: {
    title: string
    content: string
    imageUrl?: string
    installButtonText: string
    openingText: string
    openFailedText: string
    recheckButtonText: string
    checkingText: string
    notFoundText: string
    checkFailedText: string
  }
  check(context: {
    appid: number
    gameId: number
    gamePath: string
    reason: 'game-open' | 'manual-recheck'
  }): boolean | Promise<boolean>
}
