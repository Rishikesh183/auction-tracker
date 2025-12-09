import { supabase } from './supabaseClient';

const BUCKET_NAME = 'players';

/**
 * Upload a player photo to Supabase Storage
 * @param file - The image file to upload
 * @param playerName - Name of the player (used for filename)
 * @returns Public URL of the uploaded image
 */
export async function uploadPlayerPhoto(
    file: File,
    playerName: string
): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${playerName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (error) {
        throw new Error(`Failed to upload photo: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

/**
 * Delete a player photo from Supabase Storage
 * @param photoUrl - The public URL of the photo to delete
 */
export async function deletePlayerPhoto(photoUrl: string): Promise<void> {
    // Extract file path from URL
    const urlParts = photoUrl.split(`${BUCKET_NAME}/`);
    if (urlParts.length < 2) {
        throw new Error('Invalid photo URL');
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

    if (error) {
        throw new Error(`Failed to delete photo: ${error.message}`);
    }
}

/**
 * Get the public URL for a file in storage
 * @param filePath - Path to the file in storage
 * @returns Public URL
 */
export function getPublicUrl(filePath: string): string {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return data.publicUrl;
}
