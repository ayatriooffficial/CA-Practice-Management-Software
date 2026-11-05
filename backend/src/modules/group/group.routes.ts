import { Router } from 'express';
import { GroupController } from './group.controller';

const router = Router();

router.get('/', GroupController.listGroups);
router.post('/', GroupController.createGroup);
router.get('/:id', GroupController.getGroupById);
router.put('/:id', GroupController.updateGroup);
router.delete('/:id', GroupController.deleteGroup);
router.put('/:id/poc', GroupController.updateGroupPoc);
router.delete('/:id/clients/:clientId', GroupController.removeClientFromGroup);
router.get('/:id/contacts', GroupController.getGroupContacts);

export const groupRoutes = router;

