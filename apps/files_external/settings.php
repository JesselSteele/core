<?php
/**
 * @author Frank Karlitschek <frank@owncloud.org>
 * @author Joas Schilling <nickvergessen@owncloud.com>
 * @author Jörn Friedrich Dreyer <jfd@butonic.de>
 * @author Lukas Reschke <lukas@owncloud.com>
 * @author Michael Gapczynski <GapczynskiM@gmail.com>
 * @author Morris Jobke <hey@morrisjobke.de>
 * @author Robin Appelman <icewind@owncloud.com>
 * @author Vincent Petry <pvince81@owncloud.com>
 *
 * @copyright Copyright (c) 2015, ownCloud, Inc.
 * @license AGPL-3.0
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License, version 3,
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License, version 3,
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 *
 */

use \OCA\Files_External\Service\BackendService;

\OCP\User::checkAdminUser();

// we must use the same container
$appContainer = \OC_Mount_Config::$app->getContainer();
$backendService = $appContainer->query('OCA\Files_External\Service\BackendService');
$globalStoragesService = $appContainer->query('OCA\Files_external\Service\GlobalStoragesService');

OCP\Util::addScript('files_external', 'settings');
OCP\Util::addStyle('files_external', 'settings');

\OC_Util::addVendorScript('select2/select2');
\OC_Util::addVendorStyle('select2/select2');

$backends = $backendService->getBackendsVisibleFor(BackendService::VISIBILITY_ADMIN);
$authMechanisms = $backendService->getAuthMechanismsVisibleFor(BackendService::VISIBILITY_ADMIN);
foreach ($backends as $backend) {
	if ($backend->getCustomJs()) {
		\OCP\Util::addScript('files_external', $backend->getCustomJs());
	}
}
foreach ($authMechanisms as $authMechanism) {
	if ($authMechanism->getCustomJs()) {
		\OCP\Util::addScript('files_external', $authMechanism->getCustomJs());
	}
}

$tmpl = new OCP\Template('files_external', 'settings');
$tmpl->assign('encryptionEnabled', \OC::$server->getEncryptionManager()->isEnabled());
$tmpl->assign('isAdminPage', true);
$tmpl->assign('storages', $globalStoragesService->getAllStorages());
$tmpl->assign('backends', $backends);
$tmpl->assign('authMechanisms', $authMechanisms);
$tmpl->assign('userBackends', $backendService->getBackendsAllowedVisibleFor(BackendService::VISIBILITY_PERSONAL));
$tmpl->assign('dependencies', OC_Mount_Config::dependencyMessage($backendService->getBackends()));
$tmpl->assign('allowUserMounting', $backendService->isUserMountingAllowed());
return $tmpl->fetchPage();
