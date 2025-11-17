import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, Workout, Location, User } from './auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private authService = inject(AuthService);

  user$ = this.authService.user$;
  
  // Form signals
  loginEmail = signal('');
  loginPassword = signal('');
  registerUsername = signal('');
  registerEmail = signal('');
  registerPassword = signal('');
  
  // UI state signals
  activeSection = signal('dashboard');
  showAddWorkout = signal(false);
  showEditProfile = signal(false);
  locationLoading = signal(false);
  
  // Data signals
  workouts = signal<Workout[]>([]);
  savedLocations = signal<Location[]>([]);
  userData = signal<User | null>(null);
  
  // Error/Success messages
  loginError = signal('');
  registerError = signal('');
  registerSuccess = signal('');
  locationError = signal('');
  profileUpdateError = signal('');
  profileUpdateSuccess = signal('');
  
  // Current location
  currentLocation = signal<Location | null>(null);
  
  // New workout form
  newWorkout = signal({
    name: '',
    type: '',
    duration: 0,
    notes: '',
    date: new Date()
  });

  // Edit profile form
  editUsername = signal('');

  constructor() {
    // Subscribe to user changes
    this.user$.subscribe(async (firebaseUser) => {
      console.log('🔥 Firebase User:', firebaseUser);
      
      if (firebaseUser) {
        // Get user data from Firestore
        try {
          const userData = await this.authService.getUserData(firebaseUser.uid);
          console.log('🔥 Firestore User Data:', userData);
          this.userData.set(userData);
          this.editUsername.set(userData?.username || '');
        } catch (error) {
          console.error('Error loading user data:', error);
        }
        
        this.loadUserData();
      } else {
        this.workouts.set([]);
        this.savedLocations.set([]);
        this.userData.set(null);
      }
    });
  }

  // Authentication Methods
  async onLogin() {
    try {
      this.loginError.set('');
      await this.authService.login(this.loginEmail(), this.loginPassword());
      this.loginEmail.set('');
      this.loginPassword.set('');
    } catch (error: any) {
      this.loginError.set(this.getAuthErrorMessage(error));
    }
  }

  async onRegister() {
    try {
      this.registerError.set('');
      this.registerSuccess.set('');
      await this.authService.register(
        this.registerEmail(),
        this.registerPassword(),
        this.registerUsername()
      );
      this.registerSuccess.set('Account created successfully! You can now login.');
      this.registerUsername.set('');
      this.registerEmail.set('');
      this.registerPassword.set('');
    } catch (error: any) {
      this.registerError.set(this.getAuthErrorMessage(error));
    }
  }

  async signOut() {
    try {
      await this.authService.logout();
      this.activeSection.set('dashboard');
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  }

  // Workout Methods
  async loadWorkouts() {
    const user = this.userData();
    if (!user?.uid) return;

    try {
      const workouts = await this.authService.loadWorkouts(user.uid);
      this.workouts.set(workouts);
    } catch (error: any) {
      console.error('Error loading workouts:', error);
    }
  }

  async loadLocations() {
    const user = this.userData();
    if (!user?.uid) return;

    try {
      const locations = await this.authService.loadLocations(user.uid);
      this.savedLocations.set(locations);
    } catch (error: any) {
      console.error('Error loading locations:', error);
    }
  }

  async addWorkout() {
    const user = this.userData();
    if (!user?.uid) return;

    try {
      await this.authService.addWorkout(user.uid, this.newWorkout());
      this.showAddWorkout.set(false);
      this.newWorkout.set({ name: '', type: '', duration: 0, notes: '', date: new Date() });
      await this.loadWorkouts();
    } catch (error: any) {
      console.error('Error adding workout:', error);
    }
  }

  async deleteWorkout(workoutId: string) {
    const user = this.userData();
    if (!user?.uid) return;

    try {
      await this.authService.deleteWorkout(user.uid, workoutId);
      await this.loadWorkouts();
    } catch (error: any) {
      console.error('Error deleting workout:', error);
    }
  }

  async saveLocation() {
    const user = this.userData();
    const location = this.currentLocation();
    if (!user?.uid || !location) return;

    try {
      await this.authService.saveLocation(user.uid, location);
      this.currentLocation.set(null);
      await this.loadLocations();
    } catch (error: any) {
      console.error('Error saving location:', error);
    }
  }

  async deleteLocation(locationId: string) {
    const user = this.userData();
    if (!user?.uid) return;

    try {
      await this.authService.deleteLocation(user.uid, locationId);
      await this.loadLocations();
    } catch (error: any) {
      console.error('Error deleting location:', error);
    }
  }

  async onUpdateProfile() {
    const user = this.userData();
    if (!user?.uid) return;

    try {
      this.profileUpdateError.set('');
      this.profileUpdateSuccess.set('');
      await this.authService.updateUserProfile(user.uid, this.editUsername());
      
      // Reload user data to get updated information
      const updatedUserData = await this.authService.getUserData(user.uid);
      this.userData.set(updatedUserData);
      
      this.profileUpdateSuccess.set('Profile updated successfully!');
      this.showEditProfile.set(false);
    } catch (error: any) {
      this.profileUpdateError.set('Error updating profile: ' + error.message);
    }
  }

  // Location Methods
  getCurrentLocation() {
    this.locationLoading.set(true);
    this.locationError.set('');

    if (!navigator.geolocation) {
      this.locationError.set('Geolocation is not supported by this browser.');
      this.locationLoading.set(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: Location = {
          id: '',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp),
          savedAt: new Date()
        };
        this.currentLocation.set(location);
        this.locationLoading.set(false);
      },
      (error) => {
        this.locationError.set(this.getLocationErrorMessage(error));
        this.locationLoading.set(false);
      }
    );
  }

  // Helper Methods
  private async loadUserData() {
    await Promise.all([
      this.loadWorkouts(),
      this.loadLocations()
    ]);
  }

  getDisplayName(user: any): string {
    return this.userData()?.username || 
           this.userData()?.displayName || 
           user?.displayName || 
           'User';
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

  getMemberSince(): string {
    const user = this.userData();
    if (!user?.createdAt) return 'Recently';
    
    const creationDate = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt);
    return creationDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  }

  getLocationErrorMessage(error: GeolocationPositionError): string {
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

  getAuthErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  // File upload handler
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      console.log('File selected:', file.name);
    }
  }

  // UI Helpers
  userProfilePic = signal<string | null>(null);
}