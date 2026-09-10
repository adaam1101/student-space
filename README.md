# Student Space — ENS Bouzaréah

React Native / Expo app prototype for 2nd-year PEM students.

## Run

```bash
npm install
npx expo start
```

Open with Expo Go on Android/iOS, or press `w` for the web preview.

## Included flows

- Five-tab bottom navigation with Android back-button handling
- Official lessons with local download state and offline filtering
- Community uploads, duplicate warning, anonymous posts, voting, reporting and filters
- Editable weighted-average calculator with saved semesters
- Searchable contacts with email/call actions
- Persistent local profile and preferences

The app currently uses local demo data and AsyncStorage. Replace the data adapter with Supabase/Firebase or a small school API for production authentication, files, moderation and synced content.
