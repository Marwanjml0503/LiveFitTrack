import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, user, signOut, updateProfile, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, collection, addDoc, deleteDoc, doc, getDocs, query, where, orderBy, updateDoc, setDoc } from '@angular/fire/firestore';

interface Workout {
  id: string;
  name: string;
  type: string;
  duration: number;
  notes: string;
  date: Date;
}

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  savedAt: Date;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  isPremium: boolean;
  memberSince: Date;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  
  // Auth signals
  user$ = user(this.auth);
  activeSection = signal('dashboard');
  
  // Auth form fields
  loginEmail = '';
  loginPassword = '';
  registerUsername = '';
  registerEmail = '';
  registerPassword = '';
  
  // Auth messages
  loginError = signal('');
  registerError = signal('');
  registerSuccess = signal('');
  
  // Workout signals
  workouts = signal<Workout[]>([]);
  showAddWorkout = signal(false);
  newWorkout = signal<Partial<Workout>>({
    name: '',
    type: '',
    duration: 0,
    notes: '',
    date: new Date()
  });
  
  // Location signals
  currentLocation = signal<Location | null>(null);
  savedLocations = signal<Location[]>([]);
  locationLoading = signal(false);
  locationError = signal('');
  
  // Profile signals
  userProfile = signal<UserProfile | null>(null);
  userProfilePic = signal('');
  showEditProfile = signal(false);
  editUsername = '';
  profileUpdateError = signal('');
  profileUpdateSuccess = signal('');
  
  // PREMIUM UPGRADE SIGNALS
  showUpgradeModal = signal(false);
  isPremium = signal(false);
  paymentProcessing = signal(false);

  constructor() {
    // Load user profile when auth state changes
    this.user$.subscribe(user => {
      if (user) {
        console.log('User logged in:', user.email);
        this.loadUserProfile(user.uid);
        this.loadWorkouts();
        this.loadSavedLocations();
        // Set edit username to current display name
        this.editUsername = user.displayName || '';
      } else {
        console.log('User logged out');
        this.userProfile.set(null);
        this.workouts.set([]);
        this.savedLocations.set([]);
        this.editUsername = '';
      }
    });
  }

  // Load user profile from Firestore
async loadUserProfile(userId: string) {
  try {
    // Directly get the user document by ID
    const userRef = doc(this.firestore, 'users', userId);
    const userDoc = await getDocs(collection(this.firestore, 'users'));
    
    // Try to get the document directly first
    try {
      const userDocSnap = await getDocs(query(collection(this.firestore, 'users'), where('id', '==', userId)));
      
      if (!userDocSnap.empty) {
        const userData = userDocSnap.docs[0].data() as UserProfile;
        this.userProfile.set(userData);
        this.isPremium.set(userData.isPremium || false);
        console.log('User profile loaded:', userData.username);
        return;
      }
    } catch (error) {
      console.log('Trying alternative user loading method...');
    }

    // Alternative method: query by document ID
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('id', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserProfile;
      this.userProfile.set(userData);
      this.isPremium.set(userData.isPremium || false);
      console.log('User profile loaded:', userData.username);
    } else {
      // Create user profile if it doesn't exist
      console.log('No user profile found, creating new one...');
      await this.createUserProfile(userId);
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
    // Create user profile if loading fails
    await this.createUserProfile(userId);
  }
}

  // Create new user profile in Firestore
  // Create new user profile in Firestore
async createUserProfile(userId: string) {
  try {
    const user = this.auth.currentUser;
    if (!user) {
      console.log('No authenticated user found');
      return;
    }

    // Determine username - PRIORITIZE THE ACTUAL NAME FROM REGISTRATION
    let username = 'User';
    
    // 1. First priority: The name they entered during registration
    if (this.registerUsername && this.registerUsername.trim() !== '') {
      username = this.registerUsername.trim();
      console.log('Using registration username:', username);
    }
    // 2. Second priority: Firebase Auth display name (set during registration)
    else if (user.displayName && user.displayName.trim() !== '') {
      username = user.displayName.trim();
      console.log('Using Firebase display name:', username);
    }
    // 3. Last resort: Email username (avoid this if possible)
    else if (user.email) {
      // Only use email if we can extract a nice name
      const emailName = user.email.split('@')[0];
      // If it looks like a name (not random characters), use it
      if (emailName.match(/^[a-zA-Z]+$/)) {
        username = emailName.charAt(0).toUpperCase() + emailName.slice(1).toLowerCase();
      } else {
        username = 'User'; // Fallback to generic name
      }
      console.log('Using email-based name:', username);
    }

    const userProfile: UserProfile = {
      id: userId,
      username: username,
      email: user.email || '',
      isPremium: false,
      memberSince: new Date()
    };

    console.log('Creating user profile with name:', username);

    // Use setDoc to create the document
    const userRef = doc(this.firestore, 'users', userId);
    await setDoc(userRef, userProfile);
    
    this.userProfile.set(userProfile);
    this.isPremium.set(false);
    console.log('✅ New user profile created with name:', username);
    
  } catch (error) {
    console.error('❌ Error creating user profile:', error);
    
    // Create fallback profile locally
    const fallbackProfile: UserProfile = {
      id: userId,
      username: 'Marwan', // Default to your actual name
      email: '',
      isPremium: false,
      memberSince: new Date()
    };
    this.userProfile.set(fallbackProfile);
  }
}

  // Update user profile in Firestore
  async updateUserProfile(updates: Partial<UserProfile>) {
    try {
      const user = this.auth.currentUser;
      if (!user || !this.userProfile()) return;

      const userRef = doc(this.firestore, 'users', user.uid);
      
      // Convert updates to plain object for updateDoc
      const updateData: any = {};
      Object.keys(updates).forEach(key => {
        updateData[key] = (updates as any)[key];
      });
      
      await updateDoc(userRef, updateData);
      
      // Update local state
      const currentProfile = this.userProfile()!;
      const updatedProfile: UserProfile = {
        ...currentProfile,
        ...updates
      };
      this.userProfile.set(updatedProfile);
      console.log('User profile updated:', updates);
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  }

  // AUTH METHODS
  async onLogin() {
    try {
      this.loginError.set('');
      console.log('Attempting login with:', this.loginEmail);
      
      if (!this.loginEmail || !this.loginPassword) {
        this.loginError.set('Please enter both email and password');
        return;
      }

      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(
        this.auth, 
        this.loginEmail, 
        this.loginPassword
      );
      
      console.log('Login successful:', userCredential.user.email);
      
      // Clear form
      this.loginEmail = '';
      this.loginPassword = '';
      
    } catch (error: any) {
      console.error('Login error:', error);
      this.loginError.set(this.getAuthErrorMessage(error));
    }
  }

  async onRegister() {
    try {
      this.registerError.set('');
      this.registerSuccess.set('');
      
      console.log('Attempting registration with:', this.registerEmail);
      
      if (!this.registerEmail || !this.registerPassword || !this.registerUsername) {
        this.registerError.set('Please fill in all fields');
        return;
      }

      if (this.registerPassword.length < 6) {
        this.registerError.set('Password must be at least 6 characters');
        return;
      }

      // Firebase authentication - create user
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        this.registerEmail,
        this.registerPassword
      );

      // Update user profile with display name
      await updateProfile(userCredential.user, {
        displayName: this.registerUsername
      });

      // Create user document in Firestore
      await this.createUserProfile(userCredential.user.uid);

      console.log('Registration successful:', userCredential.user.email);
      
      this.registerSuccess.set('Account created successfully! Welcome!');
      
      // Clear form
      this.registerUsername = '';
      this.registerEmail = '';
      this.registerPassword = '';
      
    } catch (error: any) {
      console.error('Registration error:', error);
      this.registerError.set(this.getAuthErrorMessage(error));
    }
  }

  async signOut() {
    try {
      await signOut(this.auth);
      this.activeSection.set('dashboard');
      console.log('User signed out');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  // WORKOUT METHODS - USING NESTED COLLECTIONS
  async loadWorkouts() {
    const user = this.auth.currentUser;
    if (!user) {
      console.log('No user logged in, skipping workouts load');
      this.workouts.set([]);
      return;
    }

    try {
      // Access nested collection: users/{userId}/workouts
      const workoutsRef = collection(this.firestore, 'users', user.uid, 'workouts');
      const q = query(workoutsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const workoutsData: Workout[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        workoutsData.push({ 
          id: doc.id, 
          name: data['name'] || '',
          type: data['type'] || '',
          duration: data['duration'] || 0,
          notes: data['notes'] || '',
          date: data['date']?.toDate() || new Date()
        } as Workout);
      });
      
      this.workouts.set(workoutsData);
      console.log('Workouts loaded:', workoutsData.length);
    } catch (error) {
      console.error('Error loading workouts:', error);
      this.workouts.set([]);
    }
  }

  async addWorkout() {
    const user = this.auth.currentUser;
    if (!user) {
      console.log('No user logged in, cannot add workout');
      return;
    }

    try {
      const workoutData = {
        name: this.newWorkout().name || '',
        type: this.newWorkout().type || '',
        duration: this.newWorkout().duration || 0,
        notes: this.newWorkout().notes || '',
        date: new Date()
      };

      // Add to nested collection: users/{userId}/workouts
      const workoutsRef = collection(this.firestore, 'users', user.uid, 'workouts');
      await addDoc(workoutsRef, workoutData);
      
      console.log('Workout added:', workoutData.name);
      
      // Reload workouts
      await this.loadWorkouts();
      
      // Reset form and close modal
      this.showAddWorkout.set(false);
      this.newWorkout.set({
        name: '',
        type: '',
        duration: 0,
        notes: '',
        date: new Date()
      });
      
    } catch (error) {
      console.error('Error adding workout:', error);
    }
  }

  async deleteWorkout(workoutId: string) {
    const user = this.auth.currentUser;
    if (!user) return;

    try {
      // Delete from nested collection: users/{userId}/workouts/{workoutId}
      const workoutRef = doc(this.firestore, 'users', user.uid, 'workouts', workoutId);
      await deleteDoc(workoutRef);
      
      console.log('Workout deleted:', workoutId);
      
      // Reload workouts
      await this.loadWorkouts();
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  }

  // LOCATION METHODS - USING NESTED COLLECTIONS
  async loadSavedLocations() {
    const user = this.auth.currentUser;
    if (!user) {
      console.log('No user logged in, skipping locations load');
      this.savedLocations.set([]);
      return;
    }

    try {
      // Access nested collection: users/{userId}/locations
      const locationsRef = collection(this.firestore, 'users', user.uid, 'locations');
      const q = query(locationsRef, orderBy('savedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const locationsData: Location[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        locationsData.push({ 
          id: doc.id, 
          latitude: data['latitude'] || 0,
          longitude: data['longitude'] || 0,
          accuracy: data['accuracy'] || 0,
          timestamp: data['timestamp']?.toDate() || new Date(),
          savedAt: data['savedAt']?.toDate() || new Date()
        } as Location);
      });
      
      this.savedLocations.set(locationsData);
      console.log('Locations loaded:', locationsData.length);
    } catch (error) {
      console.error('Error loading locations:', error);
      this.savedLocations.set([]);
    }
  }

  async saveLocation() {
    const user = this.auth.currentUser;
    const currentLocation = this.currentLocation();
    
    if (!user || !currentLocation) {
      console.log('No user or location to save');
      return;
    }

    try {
      const locationData = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        timestamp: new Date(currentLocation.timestamp),
        savedAt: new Date()
      };

      // Add to nested collection: users/{userId}/locations
      const locationsRef = collection(this.firestore, 'users', user.uid, 'locations');
      await addDoc(locationsRef, locationData);
      
      console.log('Location saved:', locationData.latitude, locationData.longitude);
      
      // Reload locations
      await this.loadSavedLocations();
      
    } catch (error) {
      console.error('Error saving location:', error);
    }
  }

  async deleteLocation(locationId: string) {
    const user = this.auth.currentUser;
    if (!user) return;

    try {
      // Delete from nested collection: users/{userId}/locations/{locationId}
      const locationRef = doc(this.firestore, 'users', user.uid, 'locations', locationId);
      await deleteDoc(locationRef);
      
      console.log('Location deleted:', locationId);
      
      // Reload locations
      await this.loadSavedLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  }

  // Location methods
  async getCurrentLocation() {
    this.locationLoading.set(true);
    this.locationError.set('');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const location: Location = {
        id: '',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp),
        savedAt: new Date()
      };

      this.currentLocation.set(location);
      console.log('Current location obtained:', location.latitude, location.longitude);
    } catch (error: any) {
      console.error('Location error:', error);
      this.locationError.set(this.getLocationError(error));
    } finally {
      this.locationLoading.set(false);
    }
  }

  // Profile methods
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.userProfilePic.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  async onUpdateProfile() {
    const user = this.auth.currentUser;
    if (!user) {
      this.profileUpdateSuccess.set('Profile updated successfully! (Demo mode)');
      this.showEditProfile.set(false);
      this.editUsername = '';
      
      setTimeout(() => {
        this.profileUpdateSuccess.set('');
      }, 3000);
      return;
    }

    try {
      // Update Firebase Auth display name
      await updateProfile(user, {
        displayName: this.editUsername
      });

      // Update user profile in Firestore
      await this.updateUserProfile({
        username: this.editUsername
      });

      this.profileUpdateSuccess.set('Profile updated successfully!');
      this.showEditProfile.set(false);
      this.editUsername = '';
      
      setTimeout(() => {
        this.profileUpdateSuccess.set('');
      }, 3000);
    } catch (error: any) {
      this.profileUpdateError.set(error.message);
    }
  }

  // PREMIUM UPGRADE METHODS
  openUpgradeModal() {
    this.showUpgradeModal.set(true);
  }

  async processPayment() {
    this.paymentProcessing.set(true);
    
    // Simulate payment processing
    setTimeout(async () => {
      try {
        // Update premium status in Firestore
        const user = this.auth.currentUser;
        if (user) {
          await this.updateUserProfile({
            isPremium: true
          });
        }
        
        this.isPremium.set(true);
        this.showUpgradeModal.set(false);
        this.paymentProcessing.set(false);
        
        console.log('User upgraded to premium');
      } catch (error) {
        console.error('Error updating premium status:', error);
        this.paymentProcessing.set(false);
      }
    }, 2000);
  }

  closeUpgradeModal() {
    this.showUpgradeModal.set(false);
    this.paymentProcessing.set(false);
  }

  // Helper method for auth error messages
  getAuthErrorMessage(error: any): string {
    const errorCode = error.code;
    
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/weak-password':
        return 'Password is too weak';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      default:
        return 'An error occurred. Please try again';
    }
  }

  // Utility methods
  getDisplayName(user: any): string {
    // First try to get from Firestore user profile
    const userProfile = this.userProfile();
    if (userProfile?.username) {
      return userProfile.username;
    }
    
    // Fallback to Firebase Auth display name
    if (user?.displayName) {
      return user.displayName;
    }
    
    // Final fallback
    return 'User';
  }

  getMemberSince(): string {
    const userProfile = this.userProfile();
    if (userProfile?.memberSince) {
      return new Date(userProfile.memberSince).toLocaleDateString();
    }
    
    const user = this.auth.currentUser;
    if (user?.metadata?.creationTime) {
      return new Date(user.metadata.creationTime).toLocaleDateString();
    }
    
    return new Date().toLocaleDateString();
  }

  getWorkoutIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'Cardio': '🏃',
      'Strength': '💪',
      'Yoga': '🧘',
      'HIIT': '⚡',
      'Sports': '🏀'
    };
    return icons[type] || '💪';
  }

  getLocationError(error: any): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location permissions.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable.';
      case error.TIMEOUT:
        return 'Location request timed out.';
      default:
        return 'An unknown error occurred while getting location.';
    }
  }
}