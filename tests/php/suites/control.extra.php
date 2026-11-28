<?php
declare(strict_types=1);

// 3.9.0 kullanıcı tabanlı giriş: kurucu kullanıcı ekler, POS kullanıcı adı + parola ile girer.

function saveUser(array $u): array
{
    return jpost(controlUrl(), '/api/users/save', $u, tok(founderToken()));
}

function userLogin(string $username, string $password): array
{
    return jpost(posUrl(), '/api/auth/login', ['username' => $username, 'password' => $password]);
}

t('kullanıcı: kurucu ekler, POS parola ile girer, belirteç senkronda geçer', function () {
    createTenant('USR-A');
    assertStatus(200, saveUser(['tenantId' => 'USR-A', 'username' => 'Kasa.Ali', 'password' => 'parola-123', 'role' => 'staff']));
    $r = userLogin('kasa.ali', 'parola-123');
    assertStatus(200, $r);
    assertSame('USR-A', $r['json']['tenantId'] ?? null);
    assertSame('kasa.ali', $r['json']['username'] ?? null, 'kullanıcı adı küçük harfe indirgenir');
    assertStatus(200, jget(posUrl(), '/api/sync?tenantId=USR-A', tok($r['json']['token'])));
    T::$ctx['usr']['token'] = $r['json']['token'];
});

t('kullanıcı: yanlış parola ve olmayan kullanıcı aynı yanıtı alır', function () {
    $a = userLogin('kasa.ali', 'yanlis-parola');
    $b = userLogin('olmayan.kisi', 'yanlis-parola');
    assertStatus(401, $a);
    assertStatus(401, $b);
    assertSame('BAD_LOGIN', $a['json']['code'] ?? null);
    assertSame($a['json']['error'] ?? 1, $b['json']['error'] ?? 2, 'kullanıcı varlığı sızmaz');
});

t('kullanıcı: başka işletmenin verisine erişemez', function () {
    createTenant('USR-B');
    $t = T::$ctx['usr']['token'] ?? skip('önceki test');
    assertStatus(401, jget(posUrl(), '/api/sync?tenantId=USR-B', tok($t)));
    assertStatus(401, jget(posUrl(), '/api/sync?tenantId=DEFAULT', tok($t)));
});

t('kullanıcı: parola hash\'i hiçbir yanıtta yok (panel listesi, senkron)', function () {
    $list = jget(controlUrl(), '/api/tenants', tok(founderToken()));
    assertStatus(200, $list);
    assertNotContains('$2y$', $list['body']);
    assertContains('kasa.ali', $list['body']);
    $t = T::$ctx['usr']['token'] ?? skip('önceki test');
    $sync = jget(posUrl(), '/api/sync?tenantId=USR-A', tok($t));
    assertNotContains('$2y$', $sync['body']);
    assertNotContains('kasa.ali', $sync['body'], 'işletme oturumu kullanıcı listesini görmez');
});

t('kullanıcı: adı tüm işletmelerde tekil; zayıf/eksik parola reddedilir', function () {
    assertStatus(400, saveUser(['tenantId' => 'USR-B', 'username' => 'kasa.ali', 'password' => 'parola-456']));
    assertStatus(400, saveUser(['tenantId' => 'USR-B', 'username' => 'yeni.kisi']));
    assertStatus(400, saveUser(['tenantId' => 'USR-B', 'username' => 'yeni.kisi', 'password' => 'kisa']));
    assertStatus(400, saveUser(['tenantId' => 'USR-B', 'username' => 'a', 'password' => 'parola-456']));
    assertStatus(400, saveUser(['tenantId' => 'USR-B', 'username' => '../etc', 'password' => 'parola-456']));
    assertStatus(400, saveUser(['tenantId' => 'YOK-YOK', 'username' => 'baska.kisi', 'password' => 'parola-456']));
    assertStatus(400, saveUser(['tenantId' => 'USR-B', 'username' => 'rol.deneme', 'password' => 'parola-456', 'role' => 'founder']));
});

t('kullanıcı: parola değişince ve kullanıcı kapatılınca eski oturum (yönetici kilidi dahil) düşer', function () {
    assertStatus(200, saveUser(['tenantId' => 'USR-A', 'username' => 'mudur.ayse', 'password' => 'parola-111', 'role' => 'owner']));
    $t1 = userLogin('mudur.ayse', 'parola-111')['json']['token'];
    $mgr = jpost(posUrl(), '/api/pin/verify?tenantId=USR-A', ['pin' => '4826'], tok($t1));
    assertStatus(200, $mgr);
    $m1 = $mgr['json']['token'];
    assertStatus(200, saveUser(['tenantId' => 'USR-A', 'username' => 'mudur.ayse', 'password' => 'parola-222', 'role' => 'owner']));
    assertStatus(401, jget(posUrl(), '/api/sync?tenantId=USR-A', tok($t1)), 'parola değişti');
    assertStatus(401, jget(posUrl(), '/api/sync?tenantId=USR-A', tok($m1)), 'yönetici belirteci de düşer');
    $t2 = userLogin('mudur.ayse', 'parola-222')['json']['token'];
    assertStatus(200, saveUser(['tenantId' => 'USR-A', 'username' => 'mudur.ayse', 'role' => 'owner', 'active' => false]));
    assertStatus(401, jget(posUrl(), '/api/sync?tenantId=USR-A', tok($t2)), 'kapatıldı');
    assertStatus(401, userLogin('mudur.ayse', 'parola-222'), 'kapalı kullanıcı giremez');
});

t('kullanıcı: silinince oturumu düşer; lisans askıdaysa giriş 403 LICENSE', function () {
    assertStatus(200, saveUser(['tenantId' => 'USR-B', 'username' => 'garson.can', 'password' => 'parola-333']));
    $t = userLogin('garson.can', 'parola-333')['json']['token'];
    assertStatus(200, jpost(controlUrl(), '/api/users/delete', ['username' => 'garson.can'], tok(founderToken())));
    assertStatus(401, jget(posUrl(), '/api/sync?tenantId=USR-B', tok($t)));
    assertStatus(200, saveUser(['tenantId' => 'USR-B', 'username' => 'garson.can', 'password' => 'parola-333']));
    createTenant('USR-B', '4826', ['status' => 'suspended']);
    $r = userLogin('garson.can', 'parola-333');
    assertStatus(403, $r);
    assertSame('LICENSE', $r['json']['code'] ?? null);
});

t('kullanıcı uçları yalnızca kurucuya açık; POS sunucusunda yok', function () {
    $t = T::$ctx['usr']['token'] ?? skip('önceki test');
    assertStatus(401, jpost(controlUrl(), '/api/users/save', ['tenantId' => 'USR-A', 'username' => 'sizma.deneme', 'password' => 'parola-999'], tok($t)));
    assertStatus(404, jpost(posUrl(), '/api/users/save', ['tenantId' => 'USR-A', 'username' => 'sizma.deneme', 'password' => 'parola-999'], tok(founderToken())));
});

t('kullanıcı: toplu kayıt defteri yazımı kullanıcıları silemez/değiştiremez', function () {
    $f = tok(founderToken());
    $list = jget(controlUrl(), '/api/tenants', $f)['json']['tenants'];
    foreach ($list as &$e) { $e['users'] = [['username' => 'kasa.ali', 'hash' => password_hash('saldirgan', PASSWORD_DEFAULT), 'active' => true]]; }
    unset($e);
    jpost(posUrl(), '/api/tenants', $list, $f);
    assertStatus(401, userLogin('kasa.ali', 'saldirgan'), 'enjekte edilen hash kabul edilmez');
    assertStatus(200, userLogin('kasa.ali', 'parola-123'));
});
