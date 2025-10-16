# Update Bug Report System with File Upload

## Tasks
- [ ] Update BugReport model: remove expected/actual fields, add attachments array
- [ ] Update BugReport component: remove expected/actual fields, add file upload input
- [ ] Update bugReport route: handle multipart/form-data, save files to MongoDB
- [ ] Install multer dependency for file handling
- [ ] Test file upload and storage functionality

## Details
Remove expected and actual result fields from bug reports. Add file upload capability for images/videos to demonstrate bugs. Store uploaded files in MongoDB Atlas for admin access.
